"use client";

import { useState } from "react";
import { Loader2, UserRound } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { normalizePhoneNumber } from "@/lib/utils";

type Mode = "signin" | "register" | "forgot";
type Status = "idle" | "loading" | "error" | "info";

const inputClass =
  "mt-2 h-12 w-full rounded-md border border-stone-300 bg-white px-3 text-base outline-none ring-emerald-700 focus:ring-2";
const labelClass = "mt-4 block text-sm font-semibold text-stone-800";

export function AccountForms({ initialMode = "signin" }: { initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  // Where to land after auth: a same-origin ?next=… path, else home.
  function nextTarget() {
    if (typeof window === "undefined") return "/";
    const n = new URLSearchParams(window.location.search).get("next");
    return n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
  }

  function go(to: string) {
    // Flag a one-time welcome toast, then full-reload so server components +
    // the header pick up the new session.
    try {
      sessionStorage.setItem("justSignedIn", "1");
    } catch {
      /* ignore */
    }
    window.location.assign(to);
  }

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: String(form.get("identifier") ?? ""),
        password: String(form.get("password") ?? ""),
      }),
    });
    if (res.ok) {
      go(nextTarget());
      return;
    }
    const payload = await res.json().catch(() => ({}));
    setStatus("error");
    setMessage(payload.error ?? "Unable to sign in right now.");
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const firstName = String(form.get("first_name") ?? "").trim();
    const lastName = String(form.get("last_name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const rawPhone = String(form.get("phone") ?? "").trim();
    const consent = form.get("consent") === "on";

    let phone = "";
    if (rawPhone) {
      phone = normalizePhoneNumber(rawPhone);
      if (!phone) {
        setStatus("error");
        setMessage("That phone number doesn't look valid. Leave it blank or use a valid number.");
        return;
      }
      if (!consent) {
        setStatus("error");
        setMessage("To get SMS alerts, please check the consent box (or remove your phone number).");
        return;
      }
    }

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        phone,
      }),
    });
    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus("error");
      setMessage(payload.error ?? "Unable to create your account right now.");
      return;
    }

    // If they gave a phone, also add it to the SMS list (double opt-in flow).
    if (phone) {
      const sms = new FormData();
      sms.set("phone", phone);
      sms.set("consent", "on");
      await fetch("/api/subscribe", { method: "POST", body: sms }).catch(() => undefined);
    }

    if (payload.signedIn) {
      go(nextTarget());
      return;
    }

    setStatus("info");
    setMessage("Account created. Please sign in.");
    setMode("signin");
  }

  async function handleForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/reset`,
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("info");
    setMessage("If that email has an account, a password-reset link is on its way.");
  }

  const loading = status === "loading";

  return (
    <div className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-stone-950 text-white">
          <UserRound className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">
            {mode === "register" ? "Create your account" : mode === "forgot" ? "Reset your password" : "Sign in"}
          </h1>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            {mode === "register"
              ? "Join to like and comment on posts. Add a phone to get SMS alerts when a new city goes live."
              : mode === "forgot"
                ? "Enter your email and we'll send a reset link."
                : "Sign in with your email or phone number and password."}
          </p>
        </div>
      </div>

      {mode === "signin" ? (
        <form onSubmit={handleSignIn}>
          <label className={labelClass} htmlFor="identifier">Email or phone</label>
          <input id="identifier" name="identifier" type="text" required autoComplete="username" className={inputClass} />
          <label className={labelClass} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} />
          <SubmitButton loading={loading}>Sign in</SubmitButton>
        </form>
      ) : null}

      {mode === "register" ? (
        <form onSubmit={handleRegister}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="first_name">First name</label>
              <input id="first_name" name="first_name" type="text" required autoComplete="given-name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="last_name">Last name</label>
              <input id="last_name" name="last_name" type="text" required autoComplete="family-name" className={inputClass} />
            </div>
          </div>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          <label className={labelClass} htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
          <p className="mt-1 text-xs text-stone-500">At least 8 characters.</p>
          <label className={labelClass} htmlFor="phone">Phone <span className="font-normal text-stone-500">(optional — for SMS alerts)</span></label>
          <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="(555) 123-4567" autoComplete="tel" className={inputClass} />
          <label className="mt-4 flex items-start gap-3 text-sm leading-6 text-stone-700">
            <input name="consent" type="checkbox" className="mt-1 h-4 w-4 rounded border-stone-300 accent-emerald-800" />
            <span>
              If I added a phone number, I agree to receive trip-update SMS from Travel Map Dispatch
              (fewer than 5/week). Msg &amp; data rates may apply. Reply STOP to unsubscribe. See the{" "}
              <a className="underline hover:text-stone-950" href="/privacy" target="_blank" rel="noreferrer">privacy policy</a>{" "}
              and <a className="underline hover:text-stone-950" href="/terms" target="_blank" rel="noreferrer">terms</a>.
            </span>
          </label>
          <SubmitButton loading={loading}>Create account</SubmitButton>
        </form>
      ) : null}

      {mode === "forgot" ? (
        <form onSubmit={handleForgot}>
          <label className={labelClass} htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      ) : null}

      {message ? (
        <p className={`mt-4 rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-900"}`}>
          {message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-600">
        {mode !== "signin" ? (
          <button type="button" className="font-medium text-emerald-800 hover:text-emerald-950" onClick={() => { setMode("signin"); setMessage(""); setStatus("idle"); }}>
            Have an account? Sign in
          </button>
        ) : (
          <>
            <button type="button" className="font-medium text-emerald-800 hover:text-emerald-950" onClick={() => { setMode("register"); setMessage(""); setStatus("idle"); }}>
              Create an account
            </button>
            <button type="button" className="text-stone-500 hover:text-stone-800" onClick={() => { setMode("forgot"); setMessage(""); setStatus("idle"); }}>
              Forgot password?
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
