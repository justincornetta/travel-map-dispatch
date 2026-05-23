"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) {
      setStatus("error");
      setMessage("Supabase public env vars are required before admin login can work.");
      return;
    }

    setStatus("loading");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin`,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage("Check your email for the admin sign-in link.");
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-950 text-white">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Admin sign in</h1>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Use an email listed in <code className="font-mono">ADMIN_EMAILS</code>.
          </p>
        </div>
      </div>
      <label htmlFor="email" className="mt-6 block text-sm font-semibold text-stone-800">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Send magic link
      </button>
      {message ? (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
