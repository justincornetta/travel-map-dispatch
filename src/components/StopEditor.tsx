"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

import type { Stop, StopStatus } from "@/lib/types";
import { slugify } from "@/lib/utils";

const statuses: StopStatus[] = ["visited", "current", "upcoming"];

export function StopEditor({ stop }: { stop?: Stop }) {
  const router = useRouter();
  const [title, setTitle] = useState(stop?.title ?? "");
  const [slug, setSlug] = useState(stop?.slug ?? "");
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [message, setMessage] = useState("");
  const existingPhotoUrls = useMemo(() => stop?.photos.map((photo) => photo.url).join("\n") ?? "", [stop]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    if (stop?.id) formData.set("id", stop.id);
    if (!formData.get("slug")) formData.set("slug", slugify(String(formData.get("title") ?? "")));

    const response = await fetch("/api/admin/stops", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();
    setSaving(false);

    if (response.ok) {
      setMessage("Stop saved.");
      router.push(`/admin/stops/${payload.id}`);
      router.refresh();
    } else {
      setMessage(payload.error ?? "Unable to save stop.");
    }
  }

  async function sendNotification() {
    if (!stop?.id) return;
    setNotifying(true);
    setMessage("");

    const response = await fetch(`/api/admin/stops/${stop.id}/notify`, { method: "POST" });
    const payload = await response.json();
    setNotifying(false);
    setMessage(response.ok ? payload.message : payload.error);
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form onSubmit={save} className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-stone-800">
            Title
            <input
              name="title"
              required
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                if (!stop) setSlug(slugify(event.target.value));
              }}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Slug
            <input
              name="slug"
              required
              value={slug}
              onChange={(event) => setSlug(slugify(event.target.value))}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            City / location label
            <input
              name="location_label"
              required
              defaultValue={stop?.locationLabel}
              placeholder="Lisbon, Portugal"
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Status
            <select
              name="status"
              defaultValue={stop?.status ?? "upcoming"}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Latitude
            <input
              name="latitude"
              type="number"
              step="any"
              required
              defaultValue={stop?.latitude}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Longitude
            <input
              name="longitude"
              type="number"
              step="any"
              required
              defaultValue={stop?.longitude}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Arrival date
            <input
              name="arrival_date"
              type="date"
              defaultValue={stop?.arrivalDate ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800">
            Departure date
            <input
              name="departure_date"
              type="date"
              defaultValue={stop?.departureDate ?? ""}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-semibold text-stone-800 sm:col-span-2">
            Display after
            <input
              name="display_after"
              type="datetime-local"
              defaultValue={stop?.displayAfter ? stop.displayAfter.slice(0, 16) : ""}
              className="mt-2 h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
            />
            <span className="mt-1 block text-xs font-normal text-stone-500">
              Optional delay for city-level/current-location safety.
            </span>
          </label>
        </div>

        <label className="mt-4 block text-sm font-semibold text-stone-800">
          SMS teaser
          <textarea
            name="teaser"
            required
            rows={3}
            defaultValue={stop?.teaser}
            className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-emerald-700 focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-stone-800">
          Blog post
          <textarea
            name="body"
            rows={10}
            defaultValue={stop?.body}
            className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-emerald-700 focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-stone-800">
          Existing or remote photo URLs
          <textarea
            name="photo_urls"
            rows={4}
            defaultValue={existingPhotoUrls}
            placeholder="One URL per line"
            className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base outline-none ring-emerald-700 focus:ring-2"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold text-stone-800">
          Upload photos
          <input
            name="photos"
            type="file"
            accept="image/*"
            multiple
            className="mt-2 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="mt-4 flex items-start gap-3 text-sm font-semibold text-stone-800">
          <input
            name="is_published"
            type="checkbox"
            defaultChecked={stop?.isPublished ?? false}
            className="mt-1 h-4 w-4 rounded border-stone-300 accent-emerald-800"
          />
          Publish on the public map
        </label>
        <button
          type="submit"
          disabled={saving}
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-stone-950 px-5 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          Save stop
        </button>
      </form>

      <aside className="h-fit rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Publish controls</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          SMS sends a short teaser and link only. It will not include full blog text or images.
        </p>
        {stop ? (
          <button
            type="button"
            onClick={sendNotification}
            disabled={notifying || !stop.isPublished || stop.notificationSent}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            {notifying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            {stop.notificationSent ? "SMS already sent" : "Send SMS update"}
          </button>
        ) : (
          <p className="mt-4 rounded-md bg-stone-100 p-3 text-sm text-stone-600">Save the stop before sending SMS.</p>
        )}
        {message ? <p className="mt-4 rounded-md bg-stone-100 p-3 text-sm text-stone-700">{message}</p> : null}
      </aside>
    </div>
  );
}
