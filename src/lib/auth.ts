import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { getAdminEmails, hasSupabaseAdminConfig, hasSupabasePublicConfig } from "@/lib/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminAccess() {
  const adminEmails = getAdminEmails();

  if (!hasSupabasePublicConfig() || !hasSupabaseAdminConfig()) {
    return {
      ok: false as const,
      reason: "Supabase public and service role environment variables are required.",
    };
  }

  if (adminEmails.length === 0) {
    return {
      ok: false as const,
      reason: "ADMIN_EMAILS must include the email addresses allowed to manage the trip.",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase!.auth.getUser();

  if (!user) {
    return { ok: false as const, reason: "not_authenticated" };
  }

  const email = user.email?.toLowerCase();
  if (!email || !adminEmails.includes(email)) {
    return { ok: false as const, reason: "not_authorized" };
  }

  return { ok: true as const, user };
}

export async function requireAdminPage() {
  const access = await getAdminAccess();

  if (access.ok) return access.user;
  if (access.reason === "not_authenticated") redirect("/admin/login");

  return null;
}

export async function requireAdminApi() {
  const access = await getAdminAccess();

  if (access.ok) return { user: access.user, response: null };

  const status = access.reason === "not_authenticated" ? 401 : 403;
  return {
    user: null,
    response: NextResponse.json({ error: access.reason }, { status }),
  };
}
