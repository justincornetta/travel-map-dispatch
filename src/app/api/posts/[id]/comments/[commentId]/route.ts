import { NextResponse } from "next/server";

import { getAdminAccess } from "@/lib/auth";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

// DELETE a comment. Authors can remove their own (RLS enforces it on the
// session client); admins can remove ANY comment via the service-role client.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  const { commentId } = await params;

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Auth is not configured." }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const admin = await getAdminAccess();
  if (admin.ok) {
    // Admin moderation: delete any comment with the service-role client.
    const service = createSupabaseAdminClient();
    if (!service) {
      return NextResponse.json({ error: "Service role is not configured." }, { status: 503 });
    }
    const { error } = await service.from("post_comments").delete().eq("id", commentId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Non-admin: RLS lets this delete the row only if it belongs to the caller.
  const { error } = await supabase.from("post_comments").delete().eq("id", commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
