import type { CityProgress, Photo, Post, Stop, StopStatus } from "@/lib/types";
import { hasSupabasePublicConfig } from "@/lib/env";
import { sampleStops } from "@/lib/sample-data";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

type PhotoRow = {
  id: string;
  post_id: string;
  storage_path: string;
  alt_text: string | null;
  display_order: number;
  media_type?: string | null;
  poster_path?: string | null;
};

type PostRow = {
  id: string;
  stop_id: string;
  happened_at: string;
  created_at?: string | null;
  sort_order?: number | null;
  title: string | null;
  body: string | null;
  photos?: PhotoRow[];
};

type StopRow = {
  id: string;
  slug: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  status: StopStatus;
  arrival_date: string | null;
  departure_date: string | null;
  teaser: string | null;
  is_published: boolean;
  notification_sent: boolean;
  cover_photo_id?: string | null;
  posts?: PostRow[];
};

function photoUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!hasSupabasePublicConfig()) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/travel-photos/${path}`;
}

function mapPhoto(row: PhotoRow, fallbackAlt: string): Photo {
  const mediaType = row.media_type === "video" ? "video" : "image";
  return {
    id: row.id,
    postId: row.post_id,
    url: photoUrl(row.storage_path),
    altText: row.alt_text || fallbackAlt,
    displayOrder: row.display_order,
    mediaType,
    posterUrl: row.poster_path ? photoUrl(row.poster_path) : null,
  };
}

function mapPost(row: PostRow, fallbackAlt: string): Post {
  const photos = (row.photos ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .map((p) => mapPhoto(p, fallbackAlt));

  return {
    id: row.id,
    stopId: row.stop_id,
    happenedAt: row.happened_at,
    createdAt: row.created_at ?? row.happened_at,
    sortOrder: row.sort_order ?? 0,
    title: row.title,
    body: row.body ?? "",
    photos,
  };
}

function mapStop(row: StopRow): Stop {
  const posts = (row.posts ?? [])
    .slice()
    // Manual sort_order is the source of truth; fall back to happened_at for ties.
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime(),
    )
    .map((p) => mapPost(p, row.city));

  const flatPhotos = posts.flatMap((p) => p.photos);
  // Resolve the chosen cover (image only); fall back handled by consumers.
  const coverPhotoId = row.cover_photo_id ?? null;
  const coverPhoto =
    (coverPhotoId && flatPhotos.find((p) => p.id === coverPhotoId && p.mediaType !== "video")) || null;

  return {
    id: row.id,
    // title + locationLabel are derived for back-compat with consumers that still read them.
    title: row.city,
    slug: row.slug,
    city: row.city,
    country: row.country,
    locationLabel: `${row.city}, ${row.country}`,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    teaser: row.teaser ?? "",
    isPublished: row.is_published,
    notificationSent: row.notification_sent,
    posts,
    photos: flatPhotos,
    coverPhotoId,
    coverPhoto,
  };
}

const STOP_SELECT = "*, posts(*, photos(*))";

export async function getPublicStops(): Promise<Stop[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return sampleStops;

  const { data, error } = await supabase
    .from("stops")
    .select(STOP_SELECT)
    .eq("is_published", true)
    .order("arrival_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("Unable to load public stops", error);
    return sampleStops;
  }

  return (data as StopRow[]).map(mapStop);
}

export async function getPublicStopBySlug(slug: string): Promise<Stop | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return sampleStops.find((stop) => stop.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("stops")
    .select(STOP_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;
  return mapStop(data as StopRow);
}

/**
 * Per-user reading progress for the home timeline. Given the already-loaded
 * stops (which carry their posts), reads the signed-in user's post_views (RLS
 * scopes the query to their own rows) and derives a per-city state plus a
 * "resume here" stop id.
 *
 * resumeStopId = first city in trip order the user hasn't fully read; if every
 * non-empty city is read, the city they read most recently. Null when there's
 * no session (the caller then falls back to its default selection).
 */
export async function getViewProgress(
  stops: Stop[],
): Promise<{ progress: Record<string, CityProgress>; resumeStopId: string | null }> {
  const empty = { progress: {} as Record<string, CityProgress>, resumeStopId: null };

  const supabase = await createServerSupabaseClient();
  if (!supabase) return empty;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return empty;

  const { data, error } = await supabase.from("post_views").select("post_id, viewed_at");
  if (error) {
    console.error("Unable to load reading progress", error);
    return empty;
  }

  const viewedAt = new Map<string, number>();
  for (const row of (data as { post_id: string; viewed_at: string }[]) ?? []) {
    viewedAt.set(row.post_id, new Date(row.viewed_at).getTime());
  }

  const progress: Record<string, CityProgress> = {};
  let resumeStopId: string | null = null;
  let latestStopId: string | null = null;
  let latestAt = -1;

  for (const stop of stops) {
    const total = stop.posts.length;
    let viewed = 0;
    let maxViewedAt = -1;
    for (const post of stop.posts) {
      const t = viewedAt.get(post.id);
      if (t != null) {
        viewed += 1;
        if (t > maxViewedAt) maxViewedAt = t;
      }
    }

    const state: CityProgress["state"] =
      total === 0 ? "empty" : viewed === 0 ? "none" : viewed < total ? "partial" : "viewed";

    const isNew =
      state === "partial" &&
      stop.posts.some(
        (post) => !viewedAt.has(post.id) && new Date(post.createdAt).getTime() > maxViewedAt,
      );

    progress[stop.id] = { viewed, total, state, isNew };

    // First unread/partial city in trip order wins the resume slot.
    if (!resumeStopId && total > 0 && (state === "none" || state === "partial")) {
      resumeStopId = stop.id;
    }
    // Track the most recently read city as the all-read fallback.
    if (maxViewedAt > latestAt) {
      latestAt = maxViewedAt;
      latestStopId = stop.id;
    }
  }

  return { progress, resumeStopId: resumeStopId ?? latestStopId };
}

export async function getAdminStops(): Promise<Stop[]> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return sampleStops;

  const { data, error } = await supabase
    .from("stops")
    .select(STOP_SELECT)
    .order("arrival_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data as StopRow[]).map(mapStop);
}

export async function getAdminStopById(id: string): Promise<Stop | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return sampleStops.find((stop) => stop.id === id) ?? null;

  const { data, error } = await supabase
    .from("stops")
    .select(STOP_SELECT)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapStop(data as StopRow);
}
