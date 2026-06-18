// Client-side helper that uploads a File directly to Supabase Storage using a
// signed upload URL. This bypasses Vercel's 4.5 MB request body limit because
// the bytes never pass through our serverless function.
//
// Uploads auto-retry with backoff and detect stalled transfers, so a transient
// connection blip (common on patchy travel wifi, and more likely on larger
// video files) self-heals instead of permanently failing the file.
//
// Returns the storage path on success.

const MAX_ATTEMPTS = 3;
// Abort + retry if no upload progress is seen for this long (catches a dropped
// connection that never fires an error, without killing a slow-but-steady upload).
const STALL_MS = 60_000;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function uploadDirectToStorage(args: {
  stopId: string;
  postId: string;
  file: File;
  /** Called with 0–100 as the bytes upload. */
  onProgress?: (percent: number) => void;
}): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await attemptUpload(args);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Upload failed");
      if (attempt < MAX_ATTEMPTS) {
        args.onProgress?.(0); // reset the bar for the retry
        await delay(attempt * 1500); // 1.5s, then 3s backoff
      }
    }
  }

  throw lastError ?? new Error("Upload failed");
}

// One mint-URL + PUT cycle. A fresh signed URL is minted per attempt because
// Supabase upload tokens are single-use; re-minting also avoids any orphaned
// object since a failed PUT never creates one.
async function attemptUpload(args: {
  stopId: string;
  postId: string;
  file: File;
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

    // Stall watchdog: if no progress arrives for STALL_MS, treat the connection
    // as dropped, abort, and let the retry loop start a fresh attempt.
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let stalled = false;
    const bumpStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stalled = true;
        xhr.abort();
      }, STALL_MS);
    };
    const clearStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = null;
    };

    xhr.upload.onprogress = (e) => {
      bumpStall();
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      clearStall();
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Storage upload failed (${xhr.status} ${xhr.statusText})`));
      }
    };
    xhr.onerror = () => {
      clearStall();
      reject(new Error("Storage upload failed (network error)"));
    };
    xhr.onabort = () => {
      clearStall();
      reject(new Error(stalled ? "Storage upload stalled (no progress)" : "Storage upload aborted"));
    };

    bumpStall();
    xhr.send(file);
  });

  return path;
}
