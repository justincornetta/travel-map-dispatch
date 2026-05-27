import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// DELETE /api/admin/photos/[id] — removes the row AND best-effort deletes the
// underlying storage object. Storage delete is best-effort: if the path lives
// in remote/external URL form, we just skip storage cleanup.

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role is not configured." }, { status: 503 });
  }

  const { id } = await params;

  // Fetch the row first so we know which storage object to delete.
  const { data: photo } = await supabase
    .from("photos")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error: delErr } = await supabase.from("photos").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  if (photo?.storage_path && !photo.storage_path.startsWith("http")) {
    // Best-effort. Ignore storage errors so the row delete is the source of truth.
    await supabase.storage.from("travel-photos").remove([photo.storage_path]);
  }

  return NextResponse.json({ ok: true });
}
