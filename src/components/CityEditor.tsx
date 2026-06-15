"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Film,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Star,
  Trash2,
  X,
} from "lucide-react";

import {
  captureVideoPoster,
  compressImage,
  isVideoFile,
  readPhotoTakenAt,
  validateVideo,
} from "@/lib/image";
import type { MediaType, Stop, StopStatus } from "@/lib/types";
import { uploadDirectToStorage } from "@/lib/upload";
import { isValidDateInput, MAX_TRIP_DATE, MIN_TRIP_DATE } from "@/lib/utils";

const STATUSES: StopStatus[] = ["upcoming", "current", "visited"];

type FileStatus = "queued" | "uploading" | "done" | "error";

type QueuedFile = {
  /** Stable local key for React. */
  key: string;
  file: File;
  /** True for video clips (rendered + uploaded differently from photos). */
  isVideo: boolean;
  /** Object URL for the thumbnail preview. Revoked on remove/unmount. */
  previewUrl: string;
  status: FileStatus;
  /** 0–100 upload progress. */
  progress: number;
  error?: string;
};

type PostDraft = {
  /** Server post id once saved; undefined for never-saved drafts. */
  id?: string;
  /** Stable local key for React (also useful before save). */
  key: string;
  happenedAt: string; // datetime-local string "YYYY-MM-DDTHH:mm"
  title: string;
  body: string;
  existingPhotos: { id: string; url: string; mediaType: MediaType }[];
  /** New files queued for upload on next save. */
  queued: QueuedFile[];
  /** True once the user (or a saved post) set the time; suppresses EXIF auto-fill. */
  timeEdited: boolean;
};

function nowLocalDatetime() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

function localDatetimeToIso(local: string) {
  // datetime-local has no timezone; treat as local then convert to ISO.
  return new Date(local).toISOString();
}

function makeKey() {
  return Math.random().toString(36).slice(2, 11);
}

export function CityEditor({ stop }: { stop?: Stop }) {
  const router = useRouter();

  const [citySlug, setCitySlug] = useState(stop?.slug ?? "");
  const [cityName, setCityName] = useState(stop?.city ?? "");
  const [cityCountry, setCityCountry] = useState(stop?.country ?? "");
  const [cityLat, setCityLat] = useState(stop?.latitude ?? 0);
  const [cityLng, setCityLng] = useState(stop?.longitude ?? 0);
  const [status, setStatus] = useState<StopStatus>(stop?.status ?? "upcoming");
  const [arrivalDate, setArrivalDate] = useState(stop?.arrivalDate ?? "");
  const [departureDate, setDepartureDate] = useState(stop?.departureDate ?? "");
  const [teaser, setTeaser] = useState(stop?.teaser ?? "");
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(stop?.coverPhotoId ?? null);

  const [posts, setPosts] = useState<PostDraft[]>(() =>
    (stop?.posts ?? []).map((p) => ({
      id: p.id,
      key: p.id,
      happenedAt: toLocalDatetime(p.happenedAt),
      title: p.title ?? "",
      body: p.body,
      existingPhotos: p.photos.map((ph) => ({ id: ph.id, url: ph.url, mediaType: ph.mediaType })),
      queued: [],
      timeEdited: true,
    })),
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);

  const isExisting = Boolean(stop?.id);
  const canPublish = isExisting && stop?.isPublished === false && !stop?.notificationSent;
  const alreadyPublished = isExisting && stop?.isPublished === true;

  // localStorage autosave is scoped to brand-new cities, where there is no
  // server copy and an accidental navigation would lose everything. Existing
  // cities are already persisted server-side, so the beforeunload guard alone
  // covers them (and avoids clobbering server data with a stale local draft).
  const autosaveKey = stop?.id ? null : "cityeditor:new";

  const failedCount = posts.reduce(
    (n, p) => n + p.queued.filter((q) => q.status === "error").length,
    0,
  );

  // --- Restore an unsaved draft (new cities only) on mount ---------------
  useEffect(() => {
    if (!autosaveKey) return;
    try {
      const raw = localStorage.getItem(autosaveKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        citySlug?: string;
        cityName?: string;
        cityCountry?: string;
        cityLat?: number;
        cityLng?: number;
        status?: StopStatus;
        arrivalDate?: string;
        departureDate?: string;
        teaser?: string;
        posts?: { key?: string; happenedAt?: string; title?: string; body?: string; timeEdited?: boolean }[];
      };
      setCitySlug(saved.citySlug ?? "");
      setCityName(saved.cityName ?? "");
      setCityCountry(saved.cityCountry ?? "");
      setCityLat(saved.cityLat ?? 0);
      setCityLng(saved.cityLng ?? 0);
      setStatus(saved.status ?? "upcoming");
      setArrivalDate(saved.arrivalDate ?? "");
      setDepartureDate(saved.departureDate ?? "");
      setTeaser(saved.teaser ?? "");
      if (Array.isArray(saved.posts) && saved.posts.length > 0) {
        setPosts(
          saved.posts.map((p) => ({
            key: p.key ?? makeKey(),
            happenedAt: p.happenedAt ?? nowLocalDatetime(),
            title: p.title ?? "",
            body: p.body ?? "",
            existingPhotos: [],
            queued: [],
            timeEdited: p.timeEdited ?? false,
          })),
        );
      }
      const hasContent =
        saved.citySlug || saved.teaser || (saved.posts && saved.posts.length > 0);
      if (hasContent) {
        setMessage({ kind: "info", text: "Restored an unsaved draft from this browser. Photos need to be re-added." });
      }
    } catch {
      /* corrupt blob — ignore */
    }
    // Run once on mount.
  }, []);

  // --- Persist the draft text as it changes (new cities only) ------------
  useEffect(() => {
    if (!autosaveKey) return;
    try {
      localStorage.setItem(
        autosaveKey,
        JSON.stringify({
          citySlug,
          cityName,
          cityCountry,
          cityLat,
          cityLng,
          status,
          arrivalDate,
          departureDate,
          teaser,
          posts: posts.map((p) => ({
            key: p.key,
            happenedAt: p.happenedAt,
            title: p.title,
            body: p.body,
            timeEdited: p.timeEdited,
          })),
        }),
      );
    } catch {
      /* quota / private mode — non-fatal */
    }
  }, [autosaveKey, citySlug, cityName, cityCountry, cityLat, cityLng, status, arrivalDate, departureDate, teaser, posts]);

  // --- Dirty tracking (skip the initial render) --------------------------
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setDirty(true);
  }, [citySlug, status, arrivalDate, departureDate, teaser, posts, coverPhotoId]);

  // --- Warn before leaving with unsaved changes --------------------------
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // --- Revoke preview object URLs on unmount -----------------------------
  const postsRef = useRef(posts);
  postsRef.current = posts;
  useEffect(
    () => () => {
      postsRef.current.forEach((p) => p.queued.forEach((q) => URL.revokeObjectURL(q.previewUrl)));
    },
    [],
  );

  function updatePost(key: string, patch: Partial<PostDraft>) {
    setPosts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  }

  function setFile(postKey: string, fileKey: string, patch: Partial<QueuedFile>) {
    setPosts((prev) =>
      prev.map((p) =>
        p.key === postKey
          ? { ...p, queued: p.queued.map((q) => (q.key === fileKey ? { ...q, ...patch } : q)) }
          : p,
      ),
    );
  }

  async function addFiles(post: PostDraft, fileList: FileList | File[] | null) {
    const incoming = Array.from(fileList ?? []).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/") || /\.(heic|heif)$/i.test(f.name),
    );
    if (incoming.length === 0) return;

    // Reject over-cap videos up front with a clear message.
    const accepted: File[] = [];
    for (const f of incoming) {
      if (isVideoFile(f)) {
        const check = await validateVideo(f);
        if (!check.ok) {
          setMessage({ kind: "error", text: check.reason });
          continue;
        }
      }
      accepted.push(f);
    }
    if (accepted.length === 0) return;

    // Append (don't replace), de-duping against what's already queued.
    const seen = new Set(post.queued.map((q) => `${q.file.name}:${q.file.size}`));
    const fresh = accepted.filter((f) => !seen.has(`${f.name}:${f.size}`));
    if (fresh.length === 0) return;

    const queued: QueuedFile[] = fresh.map((file) => ({
      key: makeKey(),
      file,
      isVideo: isVideoFile(file),
      previewUrl: URL.createObjectURL(file),
      status: "queued",
      progress: 0,
    }));
    setPosts((prev) =>
      prev.map((p) => (p.key === post.key ? { ...p, queued: [...p.queued, ...queued] } : p)),
    );

    // Auto-fill "when did this happen" from the earliest photo's EXIF, unless
    // the user already set a time for this post. (Photos only — videos have no EXIF here.)
    const freshPhotos = fresh.filter((f) => !isVideoFile(f));
    if (!post.timeEdited && freshPhotos.length > 0) {
      const dates = (await Promise.all(freshPhotos.map((f) => readPhotoTakenAt(f)))).filter(
        (d): d is Date => d instanceof Date,
      );
      if (dates.length > 0) {
        const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
        setPosts((prev) =>
          prev.map((p) =>
            p.key === post.key && !p.timeEdited
              ? { ...p, happenedAt: toLocalDatetime(earliest.toISOString()) }
              : p,
          ),
        );
      }
    }
  }

  function removeFile(post: PostDraft, fileKey: string) {
    const target = post.queued.find((q) => q.key === fileKey);
    if (target) URL.revokeObjectURL(target.previewUrl);
    updatePost(post.key, { queued: post.queued.filter((q) => q.key !== fileKey) });
  }

  function addPost() {
    setPosts((prev) => [
      ...prev,
      {
        key: makeKey(),
        happenedAt: nowLocalDatetime(),
        title: "",
        body: "",
        existingPhotos: [],
        queued: [],
        timeEdited: false,
      },
    ]);
  }

  async function removePost(post: PostDraft) {
    if (post.id) {
      const ok = window.confirm("Delete this post and its photos? This can't be undone.");
      if (!ok) return;
      const r = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: r.statusText }));
        setMessage({ kind: "error", text: `Couldn't delete post: ${err.error}` });
        return;
      }
    }
    post.queued.forEach((q) => URL.revokeObjectURL(q.previewUrl));
    setPosts((prev) => prev.filter((p) => p.key !== post.key));
  }

  async function removePhoto(post: PostDraft, photoId: string) {
    const r = await fetch(`/api/admin/photos/${photoId}`, { method: "DELETE" });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      setMessage({ kind: "error", text: `Couldn't delete photo: ${err.error}` });
      return;
    }
    updatePost(post.key, { existingPhotos: post.existingPhotos.filter((p) => p.id !== photoId) });
  }

  // Drag-to-reorder for the per-post photo grid (existing saved photos).
  const dragExisting = useRef<{ postKey: string; index: number } | null>(null);
  function reorderExisting(postKey: string, from: number, to: number) {
    if (from === to) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.key !== postKey) return p;
        const arr = [...p.existingPhotos];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return { ...p, existingPhotos: arr };
      }),
    );
  }

  function reorderQueued(postKey: string, from: number, to: number) {
    if (from === to) return;
    setPosts((prev) =>
      prev.map((p) => {
        if (p.key !== postKey) return p;
        const arr = [...p.queued];
        const [moved] = arr.splice(from, 1);
        arr.splice(to, 0, moved);
        return { ...p, queued: arr };
      }),
    );
  }

  async function saveAll() {
    setMessage(null);
    if (!citySlug || !cityName) {
      setMessage({ kind: "error", text: "Search for and select a city first." });
      return;
    }
    if (!teaser.trim()) {
      setMessage({ kind: "error", text: "Add an SMS teaser (1–280 chars)." });
      return;
    }
    if (!isValidDateInput(arrivalDate)) {
      setMessage({ kind: "error", text: "Arrival date looks invalid — check the year (e.g. 2026)." });
      return;
    }
    if (!isValidDateInput(departureDate)) {
      setMessage({ kind: "error", text: "Departure date looks invalid — check the year (e.g. 2026)." });
      return;
    }
    if (arrivalDate && departureDate && arrivalDate > departureDate) {
      setMessage({ kind: "error", text: "Arrival date is after the departure date." });
      return;
    }

    setSaving(true);
    let anyFailed = false;
    try {
      // 1) Upsert the city (stop) row
      const cityRes = await fetch("/api/admin/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: stop?.id,
          slug: citySlug,
          city: cityName,
          country: cityCountry,
          latitude: cityLat,
          longitude: cityLng,
          status,
          arrival_date: arrivalDate || null,
          departure_date: departureDate || null,
          teaser,
          cover_photo_id: coverPhotoId,
        }),
      });
      if (!cityRes.ok) {
        const err = await cityRes.json().catch(() => ({ error: cityRes.statusText }));
        throw new Error(err.error || "Failed to save city.");
      }
      const cityData = (await cityRes.json()) as { id: string; slug: string };

      // 2) For each post: upsert, then upload pending photos, then register them.
      for (const post of posts) {
        const postRes = await fetch("/api/admin/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: post.id,
            stop_id: cityData.id,
            happened_at: localDatetimeToIso(post.happenedAt || nowLocalDatetime()),
            title: post.title || null,
            body: post.body,
          }),
        });
        if (!postRes.ok) {
          const err = await postRes.json().catch(() => ({ error: postRes.statusText }));
          throw new Error(`Post save failed: ${err.error}`);
        }
        const postData = (await postRes.json()) as { id: string };
        // Persist the server id so a retry reuses the same post.
        if (post.id !== postData.id) updatePost(post.key, { id: postData.id });

        // Persist drag-reordering of already-saved photos (existing first, so new
        // uploads append after them). Non-fatal if it fails.
        if (post.existingPhotos.length > 1) {
          await fetch("/api/admin/photos/reorder", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              post_id: postData.id,
              ordered_ids: post.existingPhotos.map((p) => p.id),
            }),
          }).catch(() => undefined);
        }

        // Upload everything not already stored (covers first save + retry).
        const pending = post.queued.filter((q) => q.status !== "done");
        const uploaded: {
          fileKey: string;
          storage_path: string;
          media_type: "image" | "video";
          poster_path?: string;
        }[] = [];
        for (const q of pending) {
          try {
            setFile(post.key, q.key, { status: "uploading", progress: 0, error: undefined });

            if (q.isVideo) {
              // Best-effort poster from the first frame, uploaded as a normal image.
              let posterPath: string | undefined;
              const poster = await captureVideoPoster(q.file).catch(() => null);
              if (poster) {
                posterPath = await uploadDirectToStorage({
                  stopId: cityData.id,
                  postId: postData.id,
                  file: poster,
                }).catch(() => undefined);
              }
              const path = await uploadDirectToStorage({
                stopId: cityData.id,
                postId: postData.id,
                file: q.file,
                onProgress: (percent) => setFile(post.key, q.key, { progress: percent }),
              });
              uploaded.push({ fileKey: q.key, storage_path: path, media_type: "video", poster_path: posterPath });
            } else {
              const compressed = await compressImage(q.file);
              const path = await uploadDirectToStorage({
                stopId: cityData.id,
                postId: postData.id,
                file: compressed,
                onProgress: (percent) => setFile(post.key, q.key, { progress: percent }),
              });
              uploaded.push({ fileKey: q.key, storage_path: path, media_type: "image" });
            }
          } catch (e) {
            anyFailed = true;
            setFile(post.key, q.key, {
              status: "error",
              error: e instanceof Error ? e.message : "Upload failed",
            });
          }
        }

        if (uploaded.length > 0) {
          const regRes = await fetch("/api/admin/photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              post_id: postData.id,
              photos: uploaded.map((u) => ({
                storage_path: u.storage_path,
                media_type: u.media_type,
                poster_path: u.poster_path,
              })),
            }),
          });
          if (!regRes.ok) {
            anyFailed = true;
            const err = await regRes.json().catch(() => ({ error: regRes.statusText }));
            for (const u of uploaded) {
              setFile(post.key, u.fileKey, { status: "error", error: `Register failed: ${err.error}` });
            }
          } else {
            for (const u of uploaded) {
              setFile(post.key, u.fileKey, { status: "done", progress: 100 });
            }
          }
        }
      }

      if (anyFailed) {
        setMessage({
          kind: "error",
          text: "Saved, but some photos didn't upload. Use “Retry failed uploads” below.",
        });
        return;
      }

      setDirty(false);
      if (autosaveKey) {
        try {
          localStorage.removeItem(autosaveKey);
        } catch {
          /* ignore */
        }
      }
      setMessage({ kind: "success", text: "Saved." });
      // Navigate to the city's edit page so further edits land on the persistent id.
      if (!stop?.id) {
        router.push(`/admin/stops/${cityData.id}`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setSaving(false);
    }
  }

  async function publishAndNotify() {
    if (!stop?.id) return;
    const ok = window.confirm(
      "Publish this city and send the SMS teaser to all verified subscribers? You can't undo the SMS.",
    );
    if (!ok) return;

    setPublishing(true);
    setMessage(null);
    try {
      const r = await fetch(`/api/admin/stops/${stop.id}/publish`, { method: "POST" });
      const payload = await r.json();
      if (!r.ok) {
        throw new Error(payload.error || "Publish failed.");
      }
      const txt = payload.warning
        ? payload.warning
        : `Published. SMS sent to ${payload.smsSent} of ${payload.smsAttempted ?? payload.smsSent} subscribers.`;
      setMessage({ kind: "success", text: txt });
      router.refresh();
    } catch (e) {
      setMessage({ kind: "error", text: e instanceof Error ? e.message : "Unknown error." });
    } finally {
      setPublishing(false);
    }
  }

  async function deleteCity() {
    if (!stop?.id) return;
    const ok = window.confirm(`Delete ${stop.city}? All posts and photos will be permanently removed.`);
    if (!ok) return;
    const r = await fetch(`/api/admin/stops/${stop.id}`, { method: "DELETE" });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      setMessage({ kind: "error", text: `Couldn't delete city: ${err.error}` });
      return;
    }
    router.push("/admin");
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-5 shadow-sm">
        {/* City metadata */}
        <h2 className="text-lg font-semibold text-stone-950">City details</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">
            City
            <CitySearchInput
              selectedLabel={cityName && cityCountry ? `${cityName}, ${cityCountry}` : ""}
              onSelect={({ slug, city, country, latitude, longitude }) => {
                setCitySlug(slug);
                setCityName(city);
                setCityCountry(country);
                setCityLat(latitude);
                setCityLng(longitude);
              }}
              disabled={isExisting}
            />
            {isExisting ? (
              <span className="mt-1 block text-xs font-normal text-stone-500">
                City can't be changed after the page exists.
              </span>
            ) : null}
          </label>

          <label className="block text-sm font-semibold text-stone-800">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StopStatus)}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <div className="block text-sm font-semibold text-stone-800" />
          <label className="block text-sm font-semibold text-stone-800">
            Arrival date
            <input
              type="date"
              value={arrivalDate ?? ""}
              min={MIN_TRIP_DATE}
              max={MAX_TRIP_DATE}
              onChange={(e) => setArrivalDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Departure date
            <input
              type="date"
              value={departureDate ?? ""}
              min={MIN_TRIP_DATE}
              max={MAX_TRIP_DATE}
              onChange={(e) => setDepartureDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-stone-800">
          SMS teaser <span className="text-xs font-normal text-stone-500">(≤ 280 chars — this is what subscribers see)</span>
          <textarea
            rows={3}
            value={teaser}
            maxLength={280}
            onChange={(e) => setTeaser(e.target.value)}
            className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-emerald-700 focus:ring-2"
          />
          <span className="mt-1 block text-xs font-normal text-stone-500">{teaser.length} / 280</span>
        </label>

        {/* Posts */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-stone-950">Posts ({posts.length})</h2>
        </div>
        {posts.length === 0 ? (
          <p className="mt-3 rounded-md bg-stone-100 p-3 text-sm text-stone-600">
            No posts yet. Add one to write a journal entry with photos.
          </p>
        ) : null}
        <div className="mt-4 space-y-4">
          {posts.map((post, idx) => (
            <div key={post.key} className="rounded-md border border-stone-300 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-600">Post #{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removePost(post)}
                  className="inline-flex items-center gap-1 rounded-md p-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-stone-800">
                  When did this happen?
                  <input
                    type="datetime-local"
                    value={post.happenedAt}
                    onChange={(e) => updatePost(post.key, { happenedAt: e.target.value, timeEdited: true })}
                    className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
                  />
                </label>
                <label className="block text-sm font-semibold text-stone-800">
                  Title (optional)
                  <input
                    type="text"
                    value={post.title}
                    onChange={(e) => updatePost(post.key, { title: e.target.value })}
                    placeholder="e.g. Sunset at Miradouro"
                    className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
                  />
                </label>
              </div>
              <BodyField
                value={post.body}
                onChange={(body) => updatePost(post.key, { body })}
              />

              {/* Existing photos — drag to reorder */}
              {post.existingPhotos.length > 0 ? (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-stone-800">Photos</p>
                    <p className="text-xs text-stone-400">
                      Tap ★ to set the home cover{post.existingPhotos.length > 1 ? " · drag to reorder" : ""}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {post.existingPhotos.map((photo, index) => {
                      const isCover = photo.id === coverPhotoId;
                      return (
                        <div
                          key={photo.id}
                          draggable
                          onDragStart={() => (dragExisting.current = { postKey: post.key, index })}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            const d = dragExisting.current;
                            dragExisting.current = null;
                            if (d && d.postKey === post.key) reorderExisting(post.key, d.index, index);
                          }}
                          className={`relative cursor-move rounded-md transition ${
                            isCover ? "ring-2 ring-amber-500" : "ring-emerald-600/0 hover:ring-2 hover:ring-emerald-600/40"
                          }`}
                        >
                          <img src={photo.url} alt="" className="pointer-events-none h-24 w-full rounded-md object-cover" />

                          {/* Cover (home page) toggle — photos only */}
                          {photo.mediaType !== "video" ? (
                            <button
                              type="button"
                              onClick={() => setCoverPhotoId(isCover ? null : photo.id)}
                              className={`absolute left-1 top-1 rounded-full p-1 shadow transition ${
                                isCover ? "bg-amber-500 text-white" : "bg-black/55 text-white hover:bg-black/75"
                              }`}
                              aria-label={isCover ? "Cover image (tap to unset)" : "Set as home cover image"}
                              title={isCover ? "Home cover image" : "Set as home cover"}
                            >
                              <Star className={`h-3.5 w-3.5 ${isCover ? "fill-current" : ""}`} />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => removePhoto(post, photo.id)}
                            className="absolute -right-2 -top-2 rounded-full bg-stone-950 p-1 text-white shadow"
                            aria-label="Delete photo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {/* New photo uploader */}
              <PhotoUploader
                queued={post.queued}
                disabled={saving}
                onAdd={(files) => addFiles(post, files)}
                onRemove={(fileKey) => removeFile(post, fileKey)}
                onReorder={(from, to) => reorderQueued(post.key, from, to)}
              />
            </div>
          ))}
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={addPost}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add post
          </button>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={saveAll}
            disabled={saving || publishing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            Save draft
          </button>
          {failedCount > 0 ? (
            <button
              type="button"
              onClick={saveAll}
              disabled={saving || publishing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-amber-400 bg-amber-50 px-4 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" aria-hidden /> Retry failed uploads ({failedCount})
            </button>
          ) : null}
          {isExisting ? (
            <button
              type="button"
              onClick={deleteCity}
              disabled={saving || publishing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-rose-300 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Delete city
            </button>
          ) : null}
        </div>
      </div>

      <aside className="h-fit rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Publish</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          One click reveals this city publicly and sends the SMS teaser to verified subscribers. Subsequent posts to the
          same city stay instant-visible with no new SMS.
        </p>

        {!isExisting ? (
          <p className="mt-4 rounded-md bg-stone-100 p-3 text-sm text-stone-600">Save the draft first.</p>
        ) : alreadyPublished ? (
          <div className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
            ✓ Published{stop?.notificationSent ? " · SMS sent" : ""}
          </div>
        ) : (
          <button
            type="button"
            onClick={publishAndNotify}
            disabled={publishing || !canPublish}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {publishing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
            Publish + send SMS
          </button>
        )}

        {message ? (
          <p
            className={`mt-4 rounded-md p-3 text-sm ${
              message.kind === "error"
                ? "bg-rose-50 text-rose-800"
                : message.kind === "success"
                  ? "bg-emerald-50 text-emerald-900"
                  : "bg-stone-100 text-stone-700"
            }`}
          >
            {message.text}
          </p>
        ) : null}
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body field with emoji picker
// ---------------------------------------------------------------------------

const EMOJI_LIST = [
  // Travel & places
  "✈️","🌍","🗺️","🏔️","🏖️","🗼","🏰","⛩️","🚂","🚢",
  // Nature
  "🌅","🌄","🌊","🌋","🌿","🌸","🦋","🐠","🦅","🌴",
  // Food & drink
  "🍕","🍜","🍣","🥘","🍷","☕","🍦","🥐","🌮","🥂",
  // Activities
  "🏄","🧗","🚴","🤿","⛷️","🎭","🎨","📸","🎵","🏛️",
  // Feelings & reactions
  "😊","🥰","😍","🤩","😎","🥳","😂","😭","❤️","💫",
  // Misc
  "🌙","⭐","🔥","💎","🎉","👀","🙌","💪","🫶","✨",
];

function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded p-1 text-base leading-none text-stone-400 hover:bg-stone-100 hover:text-stone-600"
        aria-label="Insert emoji"
        title="Insert emoji"
      >
        😊
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 grid w-72 grid-cols-10 gap-0.5 rounded-lg border border-stone-200 bg-white p-2 shadow-lg">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelect(emoji);
                setOpen(false);
              }}
              className="flex h-7 w-7 items-center justify-center rounded text-base hover:bg-stone-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BodyField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertEmoji(emoji: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      const pos = start + emoji.length;
      el?.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-800">Body</span>
        <EmojiPicker onSelect={insertEmoji} />
      </div>
      <textarea
        ref={textareaRef}
        rows={5}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="A few lines about the moment…"
        className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-emerald-700 focus:ring-2"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// City search
// ---------------------------------------------------------------------------

type GeoResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
};

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function CitySearchInput({
  selectedLabel,
  onSelect,
  disabled,
}: {
  selectedLabel: string;
  onSelect: (city: { slug: string; city: string; country: string; latitude: number; longitude: number }) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState(selectedLabel);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync display text when parent updates selectedLabel (e.g. localStorage restore).
  const prevLabel = useRef(selectedLabel);
  useEffect(() => {
    if (selectedLabel !== prevLabel.current) {
      setQuery(selectedLabel);
      prevLabel.current = selectedLabel;
    }
  }, [selectedLabel]);

  // Close on outside click.
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`,
        );
        const data = (await res.json()) as { results?: GeoResult[] };
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(r: GeoResult) {
    const label = r.admin1 ? `${r.name}, ${r.admin1}, ${r.country}` : `${r.name}, ${r.country}`;
    setQuery(label);
    setOpen(false);
    setResults([]);
    onSelect({ slug: slugify(r.name), city: r.name, country: r.country, latitude: r.latitude, longitude: r.longitude });
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        disabled={disabled}
        placeholder="Search any city in the world…"
        autoComplete="off"
        className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2 disabled:bg-stone-100"
      />
      {loading ? (
        <span className="absolute right-3 top-[calc(50%+4px)] -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-stone-400" aria-hidden />
        </span>
      ) : null}
      {open && results.length > 0 ? (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-stone-200 bg-white shadow-lg">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(r)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-stone-100"
              >
                <span className="font-medium">{r.name}</span>
                {r.admin1 ? <span className="text-stone-500">, {r.admin1}</span> : null}
                <span className="text-stone-500">, {r.country}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PhotoUploader({
  queued,
  disabled,
  onAdd,
  onRemove,
  onReorder,
}: {
  queued: QueuedFile[];
  disabled: boolean;
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (fileKey: string) => void;
  onReorder: (from: number, to: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const dragQueued = useRef<number | null>(null);

  return (
    <div className="mt-4">
      <p className="text-sm font-semibold text-stone-800">Add photos</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onAdd(e.dataTransfer.files);
        }}
        className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors ${
          dragging ? "border-emerald-600 bg-emerald-50" : "border-stone-300 bg-stone-50 hover:bg-stone-100"
        }`}
      >
        <ImagePlus className="h-6 w-6 text-stone-400" aria-hidden />
        <span className="mt-1 text-sm font-medium text-stone-600">Drag photos or videos here, or tap to choose</span>
        <span className="text-xs text-stone-400">
          Photos & short clips (≤60s, ≤100MB) · iOS Photos & HEIC welcome
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            // Reset so re-picking the same file still fires onChange.
            e.target.value = "";
          }}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Dedicated video picker — on iPhone this opens the Videos filter so you
          pick a real clip (Live Photos upload as a still and won't appear). */}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            videoInputRef.current?.click();
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-100"
        >
          <Film className="h-3.5 w-3.5" aria-hidden="true" />
          Add a video
        </button>
        <span className="text-xs text-stone-400">iPhone Live Photos upload as a still — use this for clips.</span>
      </div>

      {queued.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {queued.map((q, index) => (
            <div
              key={q.key}
              draggable
              onDragStart={() => (dragQueued.current = index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const from = dragQueued.current;
                dragQueued.current = null;
                if (from !== null) onReorder(from, index);
              }}
              className={`relative cursor-move overflow-hidden rounded-md ring-1 ${
                q.status === "error" ? "ring-2 ring-rose-500" : "ring-stone-200"
              }`}
            >
              {q.isVideo ? (
                <video src={q.previewUrl} muted playsInline className="h-24 w-full bg-black object-cover" />
              ) : (
                <img src={q.previewUrl} alt="" className="h-24 w-full object-cover" />
              )}

              {/* Confirm at a glance whether a clip registered as a video. */}
              {q.isVideo ? (
                <span className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <Film className="h-3 w-3" aria-hidden="true" /> Video
                </span>
              ) : null}

              {/* Uploading overlay + progress bar */}
              {q.status === "uploading" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-end bg-stone-950/40">
                  <span className="mb-1 text-xs font-semibold text-white">{q.progress}%</span>
                  <div className="h-1 w-full bg-white/30">
                    <div className="h-full bg-emerald-400 transition-all" style={{ width: `${q.progress}%` }} />
                  </div>
                </div>
              ) : null}

              {/* Done check */}
              {q.status === "done" ? (
                <span className="absolute left-1 top-1 rounded-full bg-emerald-600 p-0.5 text-white shadow">
                  <Check className="h-3 w-3" aria-hidden />
                </span>
              ) : null}

              {/* Error badge */}
              {q.status === "error" ? (
                <span
                  className="absolute left-1 top-1 inline-flex items-center gap-1 rounded bg-rose-600 px-1 py-0.5 text-[10px] font-semibold text-white shadow"
                  title={q.error}
                >
                  <AlertTriangle className="h-3 w-3" aria-hidden /> Failed
                </span>
              ) : null}

              {/* Remove (hidden while uploading) */}
              {q.status !== "uploading" ? (
                <button
                  type="button"
                  onClick={() => onRemove(q.key)}
                  disabled={disabled}
                  className="absolute -right-2 -top-2 rounded-full bg-stone-950 p-1 text-white shadow disabled:opacity-50"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
