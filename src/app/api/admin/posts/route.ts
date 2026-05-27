import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// POST /api/admin/posts — create or update a post (city journal entry).
// Posts hold their own happened_at, title, body, and photos (registered separately).

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  stop_id: z.string().uuid(),
  happened_at: z.string().datetime({ offset: true }),
  title: z.string().nullable().optional(),
  body: z.string(),
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

  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid post payload.", issues: parsed.error.issues }, { status: 400 });
  }
  const input = parsed.data;

  const payload = {
    stop_id: input.stop_id,
    happened_at: input.happened_at,
    title: input.title ?? null,
    body: input.body,
  };

  const result = input.id
    ? await supabase.from("posts").update(payload).eq("id", input.id).select("id").single()
    : await supabase.from("posts").insert(payload).select("id").single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ id: result.data.id });
}
