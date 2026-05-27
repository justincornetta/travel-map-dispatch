import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// POST /api/admin/photos — register one or more already-uploaded storage paths
// as photo rows under a post. Called by the admin UI after the browser has
// finished direct uploads via the signed-url flow.

const requestSchema = z.object({
  post_id: z.string().uuid(),
  photos: z
    .array(
      z.object({
        storage_path: z.string().min(1),
        alt_text: z.string().optional(),
      }),
    )
    .min(1),
});

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

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid photo payload.", issues: parsed.error.issues }, { status: 400 });
  }
  const { post_id, photos } = parsed.data;

  // Find the next display_order for this post so new photos append after existing ones.
  const { data: existing } = await supabase
    .from("photos")
    .select("display_order")
    .eq("post_id", post_id)
    .order("display_order", { ascending: false })
    .limit(1);
  const startOrder = (existing?.[0]?.display_order ?? -1) + 1;

  const rows = photos.map((photo, index) => ({
    post_id,
    storage_path: photo.storage_path,
    alt_text: photo.alt_text ?? null,
    display_order: startOrder + index,
  }));

  const { error, data } = await supabase.from("photos").insert(rows).select("id, storage_path, display_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ photos: data });
}
