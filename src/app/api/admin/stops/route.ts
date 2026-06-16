import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { isValidDateInput } from "@/lib/utils";

// City-level CRUD. Files are no longer accepted here — photos are uploaded
// directly to Supabase Storage from the browser and registered via /api/admin/photos.

// Rejects malformed dates (e.g. a mistyped year like "62026-06-20") that would
// otherwise store fine but crash date formatting on render.
const dateField = z
  .string()
  .nullable()
  .optional()
  .refine(isValidDateInput, {
    message: "Date must be a valid YYYY-MM-DD between 2000 and 2100.",
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2),
  city: z.string().min(1),
  country: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
  status: z.enum(["visited", "current", "upcoming"]),
  arrival_date: dateField,
  departure_date: dateField,
  teaser: z.string().min(1).max(280),
  cover_photo_id: z.string().uuid().nullable().optional(),
});

function emptyToNull(value?: string | null) {
  return value && value.length > 0 ? value : null;
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the city fields and try again.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const payload = {
    slug: input.slug,
    city: input.city,
    country: input.country,
    latitude: input.latitude,
    longitude: input.longitude,
    status: input.status,
    arrival_date: emptyToNull(input.arrival_date ?? null),
    departure_date: emptyToNull(input.departure_date ?? null),
    teaser: input.teaser,
    cover_photo_id: input.cover_photo_id ?? null,
  };

  // For a brand-new city, upsert on the unique slug instead of a blind insert.
  // This makes Save idempotent: if a previous save created the stop row but died
  // before finishing (e.g. flaky connection dropped the photo uploads), re-saving
  // updates that same row instead of throwing a duplicate-slug error.
  const result = input.id
    ? await supabase.from("stops").update(payload).eq("id", input.id).select("id, slug").single()
    : await supabase.from("stops").upsert(payload, { onConflict: "slug" }).select("id, slug").single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ id: result.data.id, slug: result.data.slug });
}
