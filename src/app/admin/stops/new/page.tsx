import { AppHeader } from "@/components/AppHeader";
import { CityEditor } from "@/components/CityEditor";
import { SetupNotice } from "@/components/SetupNotice";
import { requireAdminPage } from "@/lib/auth";

export default async function NewCityPage() {
  const user = await requireAdminPage();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        <h1 className="mb-5 text-3xl font-semibold text-stone-950">New city</h1>
        {user ? <CityEditor /> : <SetupNotice />}
      </main>
    </>
  );
}
