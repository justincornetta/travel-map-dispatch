"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from "lucide-react";

import { CITY_OPTIONS } from "@/lib/cities";
import { compressImage, readPhotoTakenAt } from "@/lib/image";
import type { Stop, StopStatus } from "@/lib/types";
import { uploadDirectToStorage } from "@/lib/upload";

const STATUSES: StopStatus[] = ["upcoming", "current", "visited"];

type FileStatus = "queued" | "uploading" | "done" | "error";

type QueuedFile = {
  /** Stable local key for React. */
  key: string;
  file: File;
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
  existingPhotos: { id: string; url: string }[];
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
  const [status, setStatus] = useState<StopStatus>(stop?.status ?? "upcoming");
  const [arrivalDate, setArrivalDate] = useState(stop?.arrivalDate ?? "");
  const [departureDate, setDepartureDate] = useState(stop?.departureDate ?? "");
  const [teaser, setTeaser] = useState(stop?.teaser ?? "");

  const [posts, setPosts] = useState<PostDraft[]>(() =>
    (stop?.posts ?? []).map((p) => ({
      id: p.id,
      key: p.id,
      happenedAt: toLocalDatetime(p.happenedAt),
      title: p.title ?? "",
      body: p.body,
      existingPhotos: p.photos.map((ph) => ({ id: ph.id, url: ph.url })),
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
        status?: StopStatus;
        arrivalDate?: string;
        departureDate?: string;
        teaser?: string;
        posts?: { key?: string; happenedAt?: string; title?: string; body?: string; timeEdited?: boolean }[];
      };
      setCitySlug(saved.citySlug ?? "");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Persist the draft text as it changes (new cities only) ------------
  useEffect(() => {
    if (!autosaveKey) return;
    try {
      localStorage.setItem(
        autosaveKey,
        JSON.stringify({
          citySlug,
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
  }, [autosaveKey, citySlug, status, arrivalDate, departureDate, teaser, posts]);

  // --- Dirty tracking (skip the initial render) --------------------------
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setDirty(true);
  }, [citySlug, status, arrivalDate, departureDate, teaser, posts]);

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
      (f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name),
    );
    if (incoming.length === 0) return;

    // Append (don't replace), de-duping against what's already queued.
    const seen = new Set(post.queued.map((q) => `${q.file.name}:${q.file.size}`));
    const fresh = incoming.filter((f) => !seen.has(`${f.name}:${f.size}`));
    if (fresh.length === 0) return;

    const queued: QueuedFile[] = fresh.map((file) => ({
      key: makeKey(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "queued",
      progress: 0,
    }));
    setPosts((prev) =>
      prev.map((p) => (p.key === post.key ? { ...p, queued: [...p.queued, ...queued] } : p)),
    );

    // Auto-fill "when did this happen" from the earliest photo's EXIF, unless
    // the user already set a time for this post.
    if (!post.timeEdited) {
      const dates = (await Promise.all(fresh.map((f) => readPhotoTakenAt(f)))).filter(
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

  async function saveAll() {
    setMessage(null);
    if (!citySlug) {
      setMessage({ kind: "error", text: "Pick a city from the dropdown first." });
      return;
    }
    if (!teaser.trim()) {
      setMessage({ kind: "error", text: "Add an SMS teaser (1–280 chars)." });
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
          status,
          arrival_date: arrivalDate || null,
          departure_date: departureDate || null,
          teaser,
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

        // Upload everything not already stored (covers first save + retry).
        const pending = post.queued.filter((q) => q.status !== "done");
        const uploaded: { fileKey: string; storage_path: string }[] = [];
        for (const q of pending) {
          try {
            setFile(post.key, q.key, { status: "uploading", progress: 0, error: undefined });
            const compressed = await compressImage(q.file);
            const path = await uploadDirectToStorage({
              stopId: cityData.id,
              postId: postData.id,
              file: compressed,
              onProgress: (percent) => setFile(post.key, q.key, { progress: percent }),
            });
            uploaded.push({ fileKey: q.key, storage_path: path });
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
              photos: uploaded.map((u) => ({ storage_path: u.storage_path })),
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
            <select
              value={citySlug}
              onChange={(e) => setCitySlug(e.target.value)}
              disabled={isExisting}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2 disabled:bg-stone-100"
            >
              <option value="">— Select a city —</option>
              {CITY_OPTIONS.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.city}, {c.country}
                </option>
              ))}
            </select>
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
              onChange={(e) => setArrivalDate(e.target.value)}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Departure date
            <input
              type="date"
              value={departureDate ?? ""}
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
        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-950">Posts ({posts.length})</h2>
          <button
            type="button"
            onClick={addPost}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add post
          </button>
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
              <label className="mt-3 block text-sm font-semibold text-stone-800">
                Body
                <textarea
                  rows={5}
                  value={post.body}
                  onChange={(e) => updatePost(post.key, { body: e.target.value })}
                  placeholder="A few lines about the moment…"
                  className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-emerald-700 focus:ring-2"
                />
              </label>

              {/* Existing photos */}
              {post.existingPhotos.length > 0 ? (
                <div className="mt-4">
                  <p className="text-sm font-semibold text-stone-800">Photos</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {post.existingPhotos.map((photo) => (
                      <div key={photo.id} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="" className="h-24 w-full rounded-md object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(post, photo.id)}
                          className="absolute -right-2 -top-2 rounded-full bg-stone-950 p-1 text-white shadow"
                          aria-label="Delete photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* New photo uploader */}
              <PhotoUploader
                queued={post.queued}
                disabled={saving}
                onAdd={(files) => addFiles(post, files)}
                onRemove={(fileKey) => removeFile(post, fileKey)}
              />
            </div>
          ))}
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

function PhotoUploader({
  queued,
  disabled,
  onAdd,
  onRemove,
}: {
  queued: QueuedFile[];
  disabled: boolean;
  onAdd: (files: FileList | File[] | null) => void;
  onRemove: (fileKey: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
        <span className="mt-1 text-sm font-medium text-stone-600">Drag photos here, or tap to choose</span>
        <span className="text-xs text-stone-400">
          Multiple selection supported · iOS Photos & HEIC welcome
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="hidden"
          onChange={(e) => {
            onAdd(e.target.files);
            // Reset so re-picking the same file still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {queued.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {queued.map((q) => (
            <div
              key={q.key}
              className={`relative overflow-hidden rounded-md ring-1 ${
                q.status === "error" ? "ring-2 ring-rose-500" : "ring-stone-200"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={q.previewUrl} alt="" className="h-24 w-full object-cover" />

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
