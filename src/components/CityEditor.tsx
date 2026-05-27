"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Send, Trash2, X } from "lucide-react";

import { CITY_OPTIONS } from "@/lib/cities";
import type { Stop, StopStatus } from "@/lib/types";
import { uploadDirectToStorage } from "@/lib/upload";

const STATUSES: StopStatus[] = ["upcoming", "current", "visited"];

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
  newFiles: File[];
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
      newFiles: [],
    })),
  );

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);

  const isExisting = Boolean(stop?.id);
  const canPublish = isExisting && stop?.isPublished === false && !stop?.notificationSent;
  const alreadyPublished = isExisting && stop?.isPublished === true;

  function updatePost(key: string, patch: Partial<PostDraft>) {
    setPosts((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
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
        newFiles: [],
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

      // 2) For each post: upsert, then upload new photos, then register them
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

        if (post.newFiles.length > 0) {
          const paths: { storage_path: string; alt_text?: string }[] = [];
          for (const file of post.newFiles) {
            const path = await uploadDirectToStorage({
              stopId: cityData.id,
              postId: postData.id,
              file,
            });
            paths.push({ storage_path: path });
          }
          const regRes = await fetch("/api/admin/photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ post_id: postData.id, photos: paths }),
          });
          if (!regRes.ok) {
            const err = await regRes.json().catch(() => ({ error: regRes.statusText }));
            throw new Error(`Photo register failed: ${err.error}`);
          }
        }
      }

      setMessage({ kind: "success", text: "Saved." });
      // Navigate to the city's edit page so further edits land on the persistent id
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
                    onChange={(e) => updatePost(post.key, { happenedAt: e.target.value })}
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

              {/* New file picker */}
              <label className="mt-4 block text-sm font-semibold text-stone-800">
                Add photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) =>
                    updatePost(post.key, {
                      newFiles: Array.from(e.target.files ?? []),
                    })
                  }
                  className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                />
                {post.newFiles.length > 0 ? (
                  <span className="mt-1 block text-xs font-normal text-stone-500">
                    {post.newFiles.length} file{post.newFiles.length === 1 ? "" : "s"} queued — saved on next save.
                  </span>
                ) : null}
              </label>
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
