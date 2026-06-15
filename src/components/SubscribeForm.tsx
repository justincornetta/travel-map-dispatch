"use client";

import { useState } from "react";
import { Loader2, MessageSquareText } from "lucide-react";

export function SubscribeForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/subscribe", {
      method: "POST",
      body: formData,
    });
    const payload = await response.json();

    if (response.ok) {
      setStatus("success");
      setMessage(payload.message);
      event.currentTarget.reset();
    } else {
      setStatus("error");
      setMessage(payload.error ?? "Unable to subscribe right now.");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-800 text-white">
          <MessageSquareText className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Get text updates</h1>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            You will get a short teaser and link when a new dispatch is published. Photos and
            full posts stay on the website.
          </p>
        </div>
      </div>

      <label className="mt-6 block text-sm font-semibold text-stone-800" htmlFor="phone">
        Mobile number
      </label>
      <input
        id="phone"
        name="phone"
        type="tel"
        required
        inputMode="tel"
        placeholder="(555) 123-4567"
        className="mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
      />

      <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-stone-700">
        <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 rounded border-stone-300 accent-emerald-800" />
        <span>
          I agree to receive trip update SMS messages from Justin's Travel Blog (operated by Justin
          Cornetta) — fewer than 5 per week. Message and data rates may apply. Reply STOP to
          unsubscribe at any time, or HELP for help. See the{" "}
          <a className="underline hover:text-stone-950" href="/privacy" target="_blank" rel="noreferrer">
            privacy policy
          </a>{" "}
          and{" "}
          <a className="underline hover:text-stone-950" href="/terms" target="_blank" rel="noreferrer">
            terms
          </a>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Join update list
      </button>

      {message ? (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
