import type { Metadata } from "next";

import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Terms & Conditions — Travel Map Dispatch",
  description:
    "Terms and conditions for using Travel Map Dispatch and subscribing to its SMS notifications.",
};

const LAST_UPDATED = "June 14, 2026";
const CONTACT_EMAIL = "justin.cornetta@gmail.com";

export default function TermsPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
        <h1 className="text-4xl font-semibold text-stone-950">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-stone-600">Last updated: {LAST_UPDATED}</p>

        <section className="prose mt-8 max-w-none text-stone-800">
          <p className="text-base leading-7">
            These terms govern your use of Travel Map Dispatch, a personal travel blog operated
            by Justin Cornetta. By visiting the site or subscribing to SMS updates, you agree to
            these terms.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">The site</h2>
          <p className="mt-3 text-base leading-7">
            Travel Map Dispatch is a personal project, not a commercial service. Content is
            provided for informational and entertainment purposes only and reflects the personal
            experience of the author. The site may be updated, paused, or taken down at any time
            without notice.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">SMS subscription</h2>
          <p className="mt-3 text-base leading-7">
            By submitting your phone number at{" "}
            <a className="underline" href="/subscribe">
              /subscribe
            </a>{" "}
            and checking the consent box, you opt in to receive SMS notifications from Travel
            Map Dispatch. After submitting, you will receive a one-time confirmation message
            with a link you must click to verify your subscription. Verified subscribers receive
            a short SMS teaser plus a link each time the blog publishes a new city update.
          </p>
          <p className="mt-3 text-base leading-7">
            Expected message frequency: fewer than 5 messages per week, typically less.{" "}
            <strong>Message and data rates may apply</strong> depending on your mobile carrier
            and plan. Travel Map Dispatch does not charge for the subscription.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Opting out</h2>
          <p className="mt-3 text-base leading-7">
            You can stop receiving messages at any time by replying{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">STOP</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">UNSUBSCRIBE</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">CANCEL</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">END</code>, or{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">QUIT</code> to any message.
            Opt-outs are processed automatically.
          </p>
          <p className="mt-3 text-base leading-7">
            Reply <code className="rounded bg-stone-100 px-1.5 py-0.5">HELP</code> for support
            information.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Accounts, comments &amp; likes</h2>
          <p className="mt-3 text-base leading-7">
            Creating an account is optional and free. You are responsible for keeping your password
            secure and for activity under your account. Provide accurate registration details.
          </p>
          <p className="mt-3 text-base leading-7">
            Comments are <strong>public</strong> and appear with your name. By posting, you grant us
            permission to display your comment on the site. Keep comments civil and lawful — no
            harassment, hate, spam, or illegal or infringing content. We may remove any comment and
            suspend accounts at our discretion, and you may delete your own comments or request
            account deletion at any time (see the{" "}
            <a className="underline" href="/privacy">Privacy Policy</a>).
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Acceptable use</h2>
          <p className="mt-3 text-base leading-7">
            Don&apos;t use the site or its services to do anything illegal, harmful, or
            disruptive. Don&apos;t attempt to circumvent access controls on the admin area.
            Don&apos;t scrape content for redistribution.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Content</h2>
          <p className="mt-3 text-base leading-7">
            All photos, text, and other content on Travel Map Dispatch are the personal work of
            the author unless explicitly attributed otherwise. They are shared informally for
            friends and subscribers. Please don&apos;t republish or use this content commercially
            without permission.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">No warranty</h2>
          <p className="mt-3 text-base leading-7">
            The site and its SMS notifications are provided &quot;as is&quot; with no warranties
            of any kind. Travel Map Dispatch is not responsible for missed messages, delivery
            delays, or any decisions you make based on content posted here. Real-world travel
            information may be out of date — verify anything that matters.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Privacy</h2>
          <p className="mt-3 text-base leading-7">
            See the{" "}
            <a className="underline" href="/privacy">
              Privacy Policy
            </a>{" "}
            for details on what information we collect and how it&apos;s used.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Changes to these terms</h2>
          <p className="mt-3 text-base leading-7">
            If these terms materially change, the updated version will be posted at this URL
            with a new &quot;Last updated&quot; date.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Contact</h2>
          <p className="mt-3 text-base leading-7">
            Questions? Email{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </main>
      <AppFooter />
    </>
  );
}
