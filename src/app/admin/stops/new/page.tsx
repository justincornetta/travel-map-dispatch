import { AppHeader } from "@/components/AppHeader";
import { SetupNotice } from "@/components/SetupNotice";
import { StopEditor } from "@/components/StopEditor";
import { requireAdminPage } from "@/lib/auth";

export default async function NewStopPage() {
  const user = await requireAdminPage();

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-6">
        <h1 className="mb-5 text-3xl font-semibold text-stone-950">New stop</h1>
        {user ? <StopEditor /> : <SetupNotice />}
      </main>
    </>
  );
}
