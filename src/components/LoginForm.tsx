"use client";

import { useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm({ configured }: { configured: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  // Primary: email + password (works for admins who've set a password).
  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    });
    if (res.ok) {
      window.location.assign("/admin");
      return;
    }
    const payload = await res.json().catch(() => ({}));
    setStatus("error");
    setMessage(payload.error ?? "Unable to sign in.");
  }

  // Fallback: magic link (no password needed).
  async function sendMagicLink() {
    if (!configured) {
      setStatus("error");
      setMessage("Supabase public env vars are required before admin login can work.");
      return;
    }
    if (!email) {
      setStatus("error");
      setMessage("Enter your email first, then request a magic link.");
      return;
    }
    setStatus("loading");
    setMessage("");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/admin` },
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
    <form onSubmit={submitPassword} className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-950 text-white">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">Admin sign in</h1>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Use an email listed in <code className="font-mono">ADMIN_EMAILS</code>.
          </p>
        </div>
      </div>

      <label htmlFor="email" className="mt-6 block text-sm font-semibold text-stone-800">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        autoComplete="username"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
      />

      <label htmlFor="password" className="mt-4 block text-sm font-semibold text-stone-800">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2"
      />

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Sign in
      </button>

      <div className="mt-4 flex items-center gap-3 text-xs text-stone-400">
        <span className="h-px flex-1 bg-stone-300" />
        or
        <span className="h-px flex-1 bg-stone-300" />
      </div>

      <button
        type="button"
        onClick={sendMagicLink}
        disabled={status === "loading"}
        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-800 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Mail className="h-4 w-4" aria-hidden="true" />
        Email me a magic link
      </button>

      <p className="mt-3 text-xs text-stone-500">
        No password yet? Use the magic link, or set one via{" "}
        <a className="underline hover:text-stone-700" href="/account">Forgot password</a>.
      </p>

      {message ? (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
