import Link from "next/link";
import { Plus } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { StatusBadge } from "@/components/StatusBadge";
import { getAdminStops } from "@/lib/data";
import { requireAdminPage } from "@/lib/auth";
import { formatDateRange } from "@/lib/utils";

export default async function AdminPage() {
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

  const stops = await getAdminStops();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-stone-950">Trip admin</h1>
            <p className="mt-1 text-sm text-stone-600">Signed in as {user.email}</p>
          </div>
          <Link
            href="/admin/stops/new"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-semibold text-white hover:bg-stone-800"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New city
          </Link>
        </div>
        {stops.length === 0 ? (
          <div className="rounded-lg border border-stone-300 bg-[#fbfaf6] p-8 text-center shadow-sm">
            <p className="text-sm text-stone-600">No cities yet. Start with the first one.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-stone-300 bg-[#fbfaf6] shadow-sm">
            {stops.map((stop) => (
              <Link
                key={stop.id}
                href={`/admin/stops/${stop.id}`}
                className="grid gap-3 border-b border-stone-200 p-4 last:border-b-0 hover:bg-white sm:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-stone-950">{stop.city}</h2>
                    <span className="text-sm text-stone-500">{stop.country}</span>
                    <StatusBadge status={stop.status} />
                  </div>
                  <p className="mt-1 text-xs font-medium text-stone-500">
                    {formatDateRange(stop.arrivalDate, stop.departureDate)} · {stop.posts.length} post
                    {stop.posts.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span
                    className={`rounded-md px-2 py-1 ${
                      stop.isPublished ? "bg-emerald-100 text-emerald-900" : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {stop.isPublished ? "Published" : "Draft"}
                  </span>
                  <span
                    className={`rounded-md px-2 py-1 ${
                      stop.notificationSent ? "bg-blue-100 text-blue-900" : "bg-stone-200 text-stone-700"
                    }`}
                  >
                    {stop.notificationSent ? "SMS sent" : "SMS pending"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
