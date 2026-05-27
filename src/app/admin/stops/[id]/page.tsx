import { notFound } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { CityEditor } from "@/components/CityEditor";
import { SetupNotice } from "@/components/SetupNotice";
import { getAdminStopById } from "@/lib/data";
import { requireAdminPage } from "@/lib/auth";

export default async function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminPage();
  const { id } = await params;
  const stop = user ? await getAdminStopById(id) : null;
  if (user && !stop) notFound();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        <h1 className="mb-5 text-3xl font-semibold text-stone-950">
          {stop ? `Edit ${stop.city}` : "Edit city"}
        </h1>
        {user && stop ? <CityEditor stop={stop} /> : <SetupNotice />}
      </main>
    </>
  );
}
