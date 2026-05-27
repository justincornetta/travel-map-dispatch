import type { Photo, Post, Stop, StopStatus } from "@/lib/types";
import { hasSupabasePublicConfig } from "@/lib/env";
import { sampleStops } from "@/lib/sample-data";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

type PhotoRow = {
  id: string;
  post_id: string;
  storage_path: string;
  alt_text: string | null;
  display_order: number;
};

type PostRow = {
  id: string;
  stop_id: string;
  happened_at: string;
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
  posts?: PostRow[];
};

function photoUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!hasSupabasePublicConfig()) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/travel-photos/${path}`;
}

function mapPhoto(row: PhotoRow, fallbackAlt: string): Photo {
  return {
    id: row.id,
    postId: row.post_id,
    url: photoUrl(row.storage_path),
    altText: row.alt_text || fallbackAlt,
    displayOrder: row.display_order,
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
    title: row.title,
    body: row.body ?? "",
    photos,
  };
}

function mapStop(row: StopRow): Stop {
  const posts = (row.posts ?? [])
    .slice()
    .sort((a, b) => new Date(a.happened_at).getTime() - new Date(b.happened_at).getTime())
    .map((p) => mapPost(p, row.city));

  const flatPhotos = posts.flatMap((p) => p.photos);

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
