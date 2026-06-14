"use client";

import { useState } from "react";
import { Loader2, KeyRound } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// Shown after a user clicks the reset link in their email. The link lands on
// /auth/callback which exchanges the code for a session, then redirects here —
// so by the time this renders the user has a session and can set a new password.
export function ResetPasswordForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setStatus("error");
      setMessage("Those passwords don't match.");
      return;
    }
    setStatus("loading");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("done");
    setMessage("Password updated. Redirecting…");
    setTimeout(() => window.location.assign("/"), 900);
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-950 text-white">
          <KeyRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Set a new password</h1>
          <p className="mt-1 text-sm leading-6 text-stone-600">Choose a new password for your account.</p>
        </div>
      </div>

      <label className="mt-6 block text-sm font-semibold text-stone-800" htmlFor="password">New password</label>
      <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password"
        className="mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2" />

      <label className="mt-4 block text-sm font-semibold text-stone-800" htmlFor="confirm">Confirm password</label>
      <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password"
        className="mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2" />

      <button type="submit" disabled={status === "loading" || status === "done"}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60">
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Update password
      </button>

      {message ? (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
