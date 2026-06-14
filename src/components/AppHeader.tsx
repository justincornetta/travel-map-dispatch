import Link from "next/link";
import { MapPin, MessageSquareText, ShieldCheck } from "lucide-react";

import { AccountMenu } from "@/components/AccountMenu";

export function AppHeader() {
  return (
    <header className="border-b border-stone-200 bg-[#fbfaf6]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-950 text-white">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-semibold">Travel Dispatch</span>
            <span className="block text-sm text-stone-600">Map, photos, and trip notes</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link
            href="/subscribe"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-800 px-4 text-white transition-colors hover:bg-emerald-900"
          >
            <MessageSquareText className="h-4 w-4" aria-hidden="true" />
            Text updates
          </Link>
          <AccountMenu />
          <Link
            href="/admin"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-stone-300 px-4 text-stone-800 transition-colors hover:bg-stone-100"
          >
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
