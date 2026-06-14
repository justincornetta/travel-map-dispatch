import Link from "next/link";
import { ArrowLeft, Heart } from "lucide-react";

import { AccountForms } from "@/components/AccountForms";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";

export default function AccountPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
        <section>
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to map
          </Link>
          <AccountForms />
        </section>
        <aside className="h-fit rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <Heart className="h-6 w-6 text-emerald-800" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-stone-950">Why make an account?</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-stone-700">
            <li>Like the posts you enjoy.</li>
            <li>Leave comments — your name shows next to them.</li>
            <li>Optionally get an SMS when a new city goes live.</li>
          </ul>
          <p className="mt-4 text-xs text-stone-500">
            By creating an account you agree to the{" "}
            <Link className="underline hover:text-stone-700" href="/privacy">privacy policy</Link>{" "}
            and <Link className="underline hover:text-stone-700" href="/terms">terms</Link>.
          </p>
        </aside>
      </main>
      <AppFooter />
    </>
  );
}
