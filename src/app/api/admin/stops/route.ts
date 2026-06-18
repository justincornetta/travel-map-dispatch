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

type AdminClient = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

// Find a slug not already used by another stop, suffixing -2, -3, … on repeats
// so the same city can be visited more than once (london, london-2, …).
async function nextFreeSlug(supabase: AdminClient, base: string): Promise<string> {
  // Pull every slug starting with the base (covers "london", "london-2", and
  // harmless false positives like "londonderry" that just get skipped).
  const { data } = await supabase.from("stops").select("slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  }
  return `${base}-${Date.now()}`;
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

  // The slug is set once at creation and never changed on update, so editing an
  // existing city can't collide with another city's slug.
  const payload = {
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

  let result;
  if (input.id) {
    // Existing city: update by id (interrupted-save recovery relies on the
    // client passing the known id, so a re-save updates rather than duplicates).
    result = await supabase.from("stops").update(payload).eq("id", input.id).select("id, slug").single();
  } else {
    // New city: pick a slug that isn't taken so revisiting a place (e.g. a
    // second London) becomes its own stop (london, london-2, …) instead of
    // colliding on the unique slug. We never upsert here — that would silently
    // overwrite an existing city.
    const slug = await nextFreeSlug(supabase, input.slug);
    result = await supabase.from("stops").insert({ ...payload, slug }).select("id, slug").single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ id: result.data.id, slug: result.data.slug });
}
