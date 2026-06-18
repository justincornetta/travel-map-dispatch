// Client-side image helpers used by the admin editor:
//  - compressImage: downscale + re-encode to JPEG (also converts iOS HEIC → JPEG
//    on browsers that can decode it, so uploads are smaller and always renderable).
//  - readPhotoTakenAt: parse EXIF DateTimeOriginal from a JPEG to auto-fill the
//    "when did this happen" field. Best-effort — returns null on anything unexpected.

const HEIC_RE = /\.(heic|heif)$/i;
const REENCODE_EXT_RE = /\.(heic|heif|png|webp|tiff?)$/i;

// Free-tier-friendly caps for native video uploads. Supabase's free plan
// rejects single uploads over ~50 MB, so cap below that and reject oversized
// clips client-side with a clear message instead of letting the upload fail.
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase free-plan per-file limit)
export const MAX_VIDEO_SECONDS = 60;

const VIDEO_EXT_RE = /\.(mov|mp4|m4v|webm|avi|mkv|3gp|hevc)$/i;

// iOS Safari sometimes reports an empty MIME type for .mov files, so fall back
// to the extension to reliably detect videos.
export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/") || VIDEO_EXT_RE.test(file.name);
}

type VideoCheck = { ok: true } | { ok: false; reason: string };

/**
 * Validate a video against the size/duration caps. Reads metadata via a
 * throwaway <video> element; if duration can't be read we only enforce size.
 */
export async function validateVideo(file: File): Promise<VideoCheck> {
  if (file.size > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      reason: `Video is too large (${Math.round(file.size / 1024 / 1024)} MB) — max ${Math.round(
        MAX_VIDEO_BYTES / 1024 / 1024,
      )} MB. Export a smaller version (e.g. QuickTime → Export As → 720p) and try again.`,
    };
  }
  const duration = await readVideoDuration(file).catch(() => null);
  if (duration != null && duration > MAX_VIDEO_SECONDS + 0.5) {
    return { ok: false, reason: `Video is too long (max ${MAX_VIDEO_SECONDS}s).` };
  }
  return { ok: true };
}

function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video metadata"));
    };
    video.src = url;
  });
}

/**
 * Grab a still frame (~0.1s in) from a video to use as its poster image.
 * Best-effort — returns null if the browser can't decode/seek the file.
 */
export async function captureVideoPoster(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => URL.revokeObjectURL(url);
    const fail = () => {
      cleanup();
      resolve(null);
    };

    video.onloadedmetadata = () => {
      // Seek a touch past the start to avoid an all-black first frame.
      video.currentTime = Math.min(0.1, video.duration || 0.1);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx || !canvas.width) return fail();
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) return resolve(null);
            const baseName = file.name.replace(/\.[^.]+$/, "");
            resolve(new File([blob], `${baseName}-poster.jpg`, { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.8,
        );
      } catch {
        fail();
      }
    };
    video.onerror = fail;
    video.src = url;
  });
}

export async function compressImage(
  file: File,
  maxDim = 2000,
  quality = 0.82,
): Promise<File> {
  const looksLikeImage = file.type.startsWith("image/") || HEIC_RE.test(file.name);
  if (!looksLikeImage) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, maxDim / longest);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) return file;

    // Don't bother if "compression" produced a larger file than the original
    // (already-optimized small JPEGs). Keep whichever is smaller, but always
    // re-encode HEIC/PNG/etc. so the stored file is a renderable JPEG.
    const mustReencode = REENCODE_EXT_RE.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
    if (!mustReencode && blob.size >= file.size) return file;

    const baseName = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch {
    // createImageBitmap can throw on formats the browser can't decode (e.g. HEIC
    // on Chrome). Fall back to the original file so the upload still proceeds.
    return file;
  }
}

export async function readPhotoTakenAt(file: File): Promise<Date | null> {
  try {
    // EXIF lives near the start of the file; reading the first 128 KB is plenty.
    const head = await file.slice(0, 131_072).arrayBuffer();
    const v = new DataView(head);
    if (v.getUint16(0) !== 0xffd8) return null; // not a JPEG (SOI marker)

    let off = 2;
    while (off + 4 <= v.byteLength) {
      const marker = v.getUint16(off);
      if ((marker & 0xff00) !== 0xff00) break;

      if (marker === 0xffe1) {
        // APP1 segment — verify the "Exif\0\0" identifier.
        const exifStart = off + 4;
        if (v.getUint32(exifStart) !== 0x45786966) break; // "Exif"

        const tiff = exifStart + 6;
        const little = v.getUint16(tiff) === 0x4949;
        const rd16 = (o: number) => v.getUint16(o, little);
        const rd32 = (o: number) => v.getUint32(o, little);

        const ifd0 = tiff + rd32(tiff + 4);

        const findEntry = (ifd: number, tag: number): number | null => {
          const count = rd16(ifd);
          for (let i = 0; i < count; i++) {
            const entry = ifd + 2 + i * 12;
            if (rd16(entry) === tag) return entry;
          }
          return null;
        };

        const readAscii = (entry: number): string | null => {
          const count = rd32(entry + 4);
          let valueOffset = entry + 8;
          if (count > 4) valueOffset = tiff + rd32(entry + 8);
          if (valueOffset + count > v.byteLength) return null;
          let s = "";
          for (let i = 0; i < count - 1; i++) {
            s += String.fromCharCode(v.getUint8(valueOffset + i));
          }
          return s;
        };

        let dt: string | null = null;
        const exifPtr = findEntry(ifd0, 0x8769); // Exif sub-IFD pointer
        if (exifPtr) {
          const subIfd = tiff + rd32(exifPtr + 8);
          const original = findEntry(subIfd, 0x9003); // DateTimeOriginal
          if (original) dt = readAscii(original);
        }
        if (!dt) {
          const basic = findEntry(ifd0, 0x0132); // DateTime
          if (basic) dt = readAscii(basic);
        }
        if (!dt) return null;

        const m = dt.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
        if (!m) return null;
        const [, Y, Mo, D, H, Mi, S] = m;
        const date = new Date(+Y, +Mo - 1, +D, +H, +Mi, +S);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      const size = v.getUint16(off + 2);
      if (size < 2) break;
      off += 2 + size;
    }
    return null;
  } catch {
    return null;
  }
}
