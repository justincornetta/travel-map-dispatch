import { AlertTriangle } from "lucide-react";

export function SetupNotice({ reason }: { reason?: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5" aria-hidden="true" />
        <div>
          <h2 className="font-semibold">Admin setup required</h2>
          <p className="mt-1 text-sm leading-6">
            {reason ?? "Configure Supabase, Twilio, and ADMIN_EMAILS before using the protected admin tools."}
          </p>
          <p className="mt-3 text-sm leading-6">
            The public site can render seed data without services, but publishing, subscriber
            storage, and SMS notifications need the environment variables in the README.
          </p>
        </div>
      </div>
    </div>
  );
}
