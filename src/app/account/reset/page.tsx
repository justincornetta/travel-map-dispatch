import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-md px-4 py-10 lg:px-6">
        <ResetPasswordForm />
      </main>
      <AppFooter />
    </>
  );
}
