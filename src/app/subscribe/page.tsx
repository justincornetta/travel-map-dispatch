import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { SubscribeForm } from "@/components/SubscribeForm";

export default async function SubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <AppHeader />
      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-6">
        <section>
          <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-stone-700 hover:text-stone-950">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to map
          </Link>
          {params.confirmed ? (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
              Your number is confirmed. Future published dispatches can be sent by text.
            </div>
          ) : null}
          <SubscribeForm />
        </section>
        <aside className="h-fit rounded-lg border border-stone-300 bg-white p-5 shadow-sm">
          <ShieldCheck className="h-6 w-6 text-emerald-800" aria-hidden="true" />
          <h2 className="mt-3 text-lg font-semibold text-stone-950">What you will receive</h2>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-stone-700">
            <li>A short message when a new city is published.</li>
            <li>A direct link back to the map and full city feed.</li>
            <li>Fewer than 5 messages per week.</li>
            <li>Reply STOP anytime to unsubscribe.</li>
          </ul>
          <p className="mt-4 text-xs text-stone-500">
            By subscribing you agree to the{" "}
            <Link className="underline hover:text-stone-700" href="/privacy">
              privacy policy
            </Link>{" "}
            and{" "}
            <Link className="underline hover:text-stone-700" href="/terms">
              terms
            </Link>
            .
          </p>
        </aside>
      </main>
      <AppFooter />
    </>
  );
}
