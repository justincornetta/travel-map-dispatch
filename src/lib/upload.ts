// Client-side helper that uploads a File directly to Supabase Storage using a
// signed upload URL. This bypasses Vercel's 4.5 MB request body limit because
// the bytes never pass through our serverless function.
//
// Returns the storage path on success.

export async function uploadDirectToStorage(args: {
  stopId: string;
  postId: string;
  file: File;
}): Promise<string> {
  const { stopId, postId, file } = args;

  // 1) Mint a signed upload URL from the server.
  const mint = await fetch("/api/admin/uploads/signed-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stopId, postId, filename: file.name }),
  });
  if (!mint.ok) {
    const err = await mint.json().catch(() => ({ error: mint.statusText }));
    throw new Error(`Failed to get upload URL: ${err.error || mint.statusText}`);
  }
  const { signedUrl, path } = (await mint.json()) as { signedUrl: string; path: string; token: string };

  // 2) PUT the bytes to the signed URL. Supabase Storage accepts a multipart POST too,
  //    but a raw PUT with the file body is simpler and matches what createSignedUploadUrl returns.
  const put = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Storage upload failed (${put.status} ${put.statusText})`);
  }

  return path;
}
