import type { Stop, StopStatus } from "@/lib/types";
import { hasSupabasePublicConfig } from "@/lib/env";
import { sampleStops } from "@/lib/sample-data";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

type PhotoRow = {
  id: string;
  stop_id: string;
  storage_path: string;
  alt_text: string | null;
  display_order: number;
};

type StopRow = {
  id: string;
  title: string;
  slug: string;
  location_label: string;
  latitude: number;
  longitude: number;
  status: StopStatus;
  arrival_date: string | null;
  departure_date: string | null;
  display_after: string | null;
  teaser: string | null;
  body: string | null;
  is_published: boolean;
  notification_sent: boolean;
  photos?: PhotoRow[];
};

function photoUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!hasSupabasePublicConfig()) return path;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  return `${base}/storage/v1/object/public/travel-photos/${path}`;
}

function mapStop(row: StopRow): Stop {
  const photos = (row.photos ?? [])
    .sort((a, b) => a.display_order - b.display_order)
    .map((photo) => ({
      id: photo.id,
      stopId: photo.stop_id,
      url: photoUrl(photo.storage_path),
      altText: photo.alt_text || row.title,
      displayOrder: photo.display_order,
    }));

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    locationLabel: row.location_label,
    latitude: row.latitude,
    longitude: row.longitude,
    status: row.status,
    arrivalDate: row.arrival_date,
    departureDate: row.departure_date,
    displayAfter: row.display_after,
    teaser: row.teaser ?? "",
    body: row.body ?? "",
    isPublished: row.is_published,
    notificationSent: row.notification_sent,
    photos,
  };
}

export async function getPublicStops() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return sampleStops;

  const { data, error } = await supabase
    .from("stops")
    .select("*, photos(*)")
    .eq("is_published", true)
    .or(`display_after.is.null,display_after.lte.${new Date().toISOString()}`)
    .order("arrival_date", { ascending: true });

  if (error) {
    console.error("Unable to load public stops", error);
    return sampleStops;
  }

  return (data as StopRow[]).map(mapStop);
}

export async function getPublicStopBySlug(slug: string) {
  const stops = await getPublicStops();
  return stops.find((stop) => stop.slug === slug) ?? null;
}

export async function getAdminStops() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return sampleStops;

  const { data, error } = await supabase
    .from("stops")
    .select("*, photos(*)")
    .order("arrival_date", { ascending: true, nullsFirst: false });

  if (error) throw new Error(error.message);
  return (data as StopRow[]).map(mapStop);
}

export async function getAdminStopById(id: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) return sampleStops.find((stop) => stop.id === id) ?? null;

  const { data, error } = await supabase
    .from("stops")
    .select("*, photos(*)")
    .eq("id", id)
    .single();

  if (error) return null;
  return mapStop(data as StopRow);
}
