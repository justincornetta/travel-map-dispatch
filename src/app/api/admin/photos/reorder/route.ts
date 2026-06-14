import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// PATCH /api/admin/photos/reorder — set display_order for a post's photos to
// match the given id order (drag-to-reorder in the admin editor).
const schema = z.object({
  post_id: z.string().uuid(),
  ordered_ids: z.array(z.string().uuid()).min(1),
});

export async function PATCH(request: Request) {
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reorder payload." }, { status: 400 });
  }
  const { post_id, ordered_ids } = parsed.data;

  // Assign display_order = position in the list, scoped to this post.
  for (let i = 0; i < ordered_ids.length; i++) {
    const { error } = await supabase
      .from("photos")
      .update({ display_order: i })
      .eq("id", ordered_ids[i])
      .eq("post_id", post_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
