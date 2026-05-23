import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

const stopSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2),
  slug: z.string().min(2),
  location_label: z.string().min(2),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  status: z.enum(["visited", "current", "upcoming"]),
  arrival_date: z.string().optional(),
  departure_date: z.string().optional(),
  display_after: z.string().optional(),
  teaser: z.string().min(1).max(280),
  body: z.string().optional(),
  is_published: z.boolean(),
});

function emptyToNull(value?: string) {
  return value && value.length > 0 ? value : null;
}

function cleanFileName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function POST(request: Request) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 503 });
  }

  const formData = await request.formData();
  const parsed = stopSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    slug: slugify(String(formData.get("slug") || formData.get("title") || "")),
    location_label: formData.get("location_label"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    status: formData.get("status"),
    arrival_date: String(formData.get("arrival_date") ?? ""),
    departure_date: String(formData.get("departure_date") ?? ""),
    display_after: String(formData.get("display_after") ?? ""),
    teaser: formData.get("teaser"),
    body: String(formData.get("body") ?? ""),
    is_published: formData.get("is_published") === "on" || formData.get("is_published") === "true",
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Check the stop fields and try again." }, { status: 400 });
  }

  const input = parsed.data;
  const stopPayload = {
    title: input.title,
    slug: input.slug,
    location_label: input.location_label,
    latitude: input.latitude,
    longitude: input.longitude,
    status: input.status,
    arrival_date: emptyToNull(input.arrival_date),
    departure_date: emptyToNull(input.departure_date),
    display_after: input.display_after ? new Date(input.display_after).toISOString() : null,
    teaser: input.teaser,
    body: input.body ?? "",
    is_published: input.is_published,
  };

  const stopResult = input.id
    ? await supabase.from("stops").update(stopPayload).eq("id", input.id).select("id, slug").single()
    : await supabase.from("stops").insert(stopPayload).select("id, slug").single();

  if (stopResult.error) {
    return NextResponse.json({ error: stopResult.error.message }, { status: 500 });
  }

  const stopId = stopResult.data.id as string;
  const photoRows: { stop_id: string; storage_path: string; alt_text: string; display_order: number }[] = [];
  const remoteUrls = String(formData.get("photo_urls") ?? "")
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);

  remoteUrls.forEach((url, index) => {
    photoRows.push({
      stop_id: stopId,
      storage_path: url,
      alt_text: input.title,
      display_order: index,
    });
  });

  const files = formData
    .getAll("photos")
    .filter((file): file is File => file instanceof File && file.size > 0);

  for (const file of files) {
    const path = `${stopId}/${crypto.randomUUID()}-${cleanFileName(file.name)}`;
    const { error } = await supabase.storage
      .from("travel-photos")
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type || "application/octet-stream",
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    photoRows.push({
      stop_id: stopId,
      storage_path: path,
      alt_text: input.title,
      display_order: photoRows.length,
    });
  }

  await supabase.from("photos").delete().eq("stop_id", stopId);
  if (photoRows.length > 0) {
    const { error } = await supabase.from("photos").insert(photoRows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: stopId, slug: stopResult.data.slug });
}
