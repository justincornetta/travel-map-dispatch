"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

// Shows a one-time "Welcome, {name}" toast right after a sign-in/register. The
// auth forms set a sessionStorage flag before redirecting; we resolve the name
// from the active session so it works for both sign-in and registration.
export function WelcomeToast() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let flag: string | null = null;
    try {
      flag = sessionStorage.getItem("justSignedIn");
      if (flag) sessionStorage.removeItem("justSignedIn");
    } catch {
      return;
    }
    if (!flag) return;

    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => {
      const first = (data.user?.user_metadata?.first_name as string) || "";
      setName(first || "back");
      setTimeout(() => setName(null), 4500);
    });
  }, []);

  if (!name) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[2000] -translate-x-1/2 animate-[fade-in_200ms_ease-out]">
      <div className="flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        Welcome, {name}!
      </div>
    </div>
  );
}
