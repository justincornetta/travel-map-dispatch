import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { MembersTable, type Member } from "@/components/MembersTable";
import { getPublicStops } from "@/lib/data";
import { requireAdminPage } from "@/lib/auth";
import { getAdminEmails } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
};

export default async function MembersPage() {
  const user = await requireAdminPage();
  if (!user) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto w-full max-w-4xl px-4 py-6 lg:px-6">
          <SetupNotice />
        </main>
      </>
    );
  }

  const admin = createSupabaseAdminClient();
  const adminEmails = getAdminEmails();

  // Auth users carry last_sign_in_at; profiles carry name/phone/signup time.
  const { data: usersData } = (await admin?.auth.admin.listUsers({ perPage: 200 })) ?? { data: null };
  const { data: profiles } = (await admin?.from("profiles").select("id, first_name, last_name, email, phone, created_at")) ?? {
    data: null,
  };

  const lastSignInById = new Map((usersData?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));

  // Reading progress: how much of the published blog each account has viewed.
  // Build the universe of currently-published posts, then tally each user's
  // post_views against it (views of unpublished/removed posts don't count).
  const publishedStops = await getPublicStops();
  const cityPostIds = publishedStops
    .map((s) => s.posts.map((p) => p.id))
    .filter((ids) => ids.length > 0);
  const publishedPostIds = new Set(cityPostIds.flat());
  const totalPosts = publishedPostIds.size;
  const totalCities = cityPostIds.length;

  // user_id -> set of viewed published post ids
  const viewsByUser = new Map<string, Set<string>>();
  const { data: viewRows } = (await admin?.from("post_views").select("user_id, post_id")) ?? { data: null };
  for (const row of (viewRows as { user_id: string; post_id: string }[] | null) ?? []) {
    if (!publishedPostIds.has(row.post_id)) continue;
    let set = viewsByUser.get(row.user_id);
    if (!set) viewsByUser.set(row.user_id, (set = new Set()));
    set.add(row.post_id);
  }

  function progressFor(userId: string): { viewedPosts: number; citiesViewed: number } {
    const seen = viewsByUser.get(userId);
    if (!seen || seen.size === 0) return { viewedPosts: 0, citiesViewed: 0 };
    const citiesViewed = cityPostIds.filter((ids) => ids.every((id) => seen.has(id))).length;
    return { viewedPosts: seen.size, citiesViewed };
  }

  const members: Member[] = ((profiles as ProfileRow[] | null) ?? [])
    .map((p) => {
      const email = p.email ?? "";
      const { viewedPosts, citiesViewed } = progressFor(p.id);
      return {
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email,
        phone: p.phone,
        signedUpAt: p.created_at,
        lastSignInAt: lastSignInById.get(p.id) ?? null,
        isAdmin: email ? adminEmails.includes(email.toLowerCase()) : false,
        viewedPosts,
        citiesViewed,
      };
    })
    .sort((a, b) => (b.signedUpAt ?? "").localeCompare(a.signedUpAt ?? ""));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        <Link href="/admin" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to admin
        </Link>
        <h1 className="text-3xl font-semibold text-stone-950">Members</h1>
        <p className="mb-5 mt-1 text-sm text-stone-600">
          {members.length} signed-up {members.length === 1 ? "account" : "accounts"}.
        </p>
        <MembersTable members={members} totalPosts={totalPosts} totalCities={totalCities} />
      </main>
    </>
  );
}
