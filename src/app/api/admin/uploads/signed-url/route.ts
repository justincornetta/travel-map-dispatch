import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminApi } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Returns a Supabase Storage signed-upload URL so the browser can PUT a file
// straight to storage, bypassing the 4.5 MB Vercel function body limit.
//
// Flow:
//   1. Client calls this with { stopId, postId, filename } and gets { signedUrl, token, path }
//   2. Client uploads bytes directly to signedUrl
//   3. Client calls POST /api/admin/photos with { postId, paths: [{ storage_path, alt_text }] }
//      to register the uploaded files as photo rows.

const requestSchema = z.object({
  stopId: z.string().uuid(),
  postId: z.string().uuid(),
  filename: z.string().min(1),
});

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid signed-url request.", issues: parsed.error.issues }, { status: 400 });
  }

  const { stopId, postId, filename } = parsed.data;
  const path = `${stopId}/${postId}/${crypto.randomUUID()}-${cleanFileName(filename)}`;

  const { data, error } = await supabase.storage.from("travel-photos").createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to mint signed URL." }, { status: 500 });
  }

  return NextResponse.json({
    path,
    signedUrl: data.signedUrl,
    token: data.token,
  });
}
