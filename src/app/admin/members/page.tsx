import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { MembersTable, type Member } from "@/components/MembersTable";
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

  const members: Member[] = ((profiles as ProfileRow[] | null) ?? [])
    .map((p) => {
      const email = p.email ?? "";
      return {
        id: p.id,
        firstName: p.first_name,
        lastName: p.last_name,
        email,
        phone: p.phone,
        signedUpAt: p.created_at,
        lastSignInAt: lastSignInById.get(p.id) ?? null,
        isAdmin: email ? adminEmails.includes(email.toLowerCase()) : false,
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
        <MembersTable members={members} />
      </main>
    </>
  );
}
