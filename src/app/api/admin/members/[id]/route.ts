import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// DELETE /api/admin/members/[id] — permanently remove a visitor account.
// Deleting the auth user cascades to their profile, likes, and comments via the
// on-delete-cascade foreign keys.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role is not configured." }, { status: 503 });
  }

  const { id } = await params;
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
