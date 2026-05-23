import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "@/components/LoginForm";
import { hasSupabasePublicConfig } from "@/lib/env";

export default function AdminLoginPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-6 lg:px-6">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-950">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to map
        </Link>
        <LoginForm configured={hasSupabasePublicConfig()} />
      </main>
    </>
  );
}
