// Client-side helper that uploads a File directly to Supabase Storage using a
// signed upload URL. This bypasses Vercel's 4.5 MB request body limit because
// the bytes never pass through our serverless function.
//
// Returns the storage path on success.

export async function uploadDirectToStorage(args: {
  stopId: string;
  postId: string;
  file: File;
  /** Called with 0–100 as the bytes upload. */
  onProgress?: (percent: number) => void;
}): Promise<string> {
  const { stopId, postId, file, onProgress } = args;

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

  // 2) PUT the bytes to the signed URL via XHR so we can report upload progress
  //    (fetch has no upload-progress events). Supabase Storage accepts a raw PUT
  //    with the file body, matching what createSignedUploadUrl returns.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Storage upload failed (${xhr.status} ${xhr.statusText})`));
      }
    };
    xhr.onerror = () => reject(new Error("Storage upload failed (network error)"));
    xhr.send(file);
  });

  return path;
}
