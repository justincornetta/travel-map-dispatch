"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// Header account control: "Sign in" when logged out; the user's first name + a
// sign-out button when logged in. Reads the name from auth user metadata (set
// at signup) so it needs no extra query.
export function AccountMenu() {
  const [name, setName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const u = data.user;
      setName(u ? (u.user_metadata?.first_name as string) || u.email || "Account" : null);
      setLoaded(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      setName(u ? (u.user_metadata?.first_name as string) || u.email || "Account" : null);
      setLoaded(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  // Avoid a flash of the wrong state before we know the session.
  if (!loaded) {
    return <span className="inline-flex h-10 w-24 items-center rounded-md" aria-hidden="true" />;
  }

  if (!name) {
    return (
      <Link
        href="/account"
        className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 px-4 text-stone-800 transition-colors hover:bg-stone-100"
      >
        <UserRound className="h-4 w-4" aria-hidden="true" />
        Sign in
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex h-10 items-center gap-2 rounded-md px-3 text-stone-700">
        <UserRound className="h-4 w-4 text-emerald-800" aria-hidden="true" />
        <span className="max-w-[8rem] truncate font-medium">{name}</span>
      </span>
      <button
        type="button"
        onClick={signOut}
        className="inline-flex h-10 items-center gap-1 rounded-md px-2 text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </span>
  );
}
