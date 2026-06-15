import type { Metadata } from "next";

import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Privacy Policy — Justin's Travel Blog",
  description:
    "How Justin's Travel Blog handles your account details, comments, and phone number.",
};

const LAST_UPDATED = "June 15, 2026";
const CONTACT_EMAIL = "justin.cornetta@gmail.com";

export default function PrivacyPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
        <h1 className="text-4xl font-semibold text-stone-950">Privacy Policy</h1>
        <p className="mt-2 text-sm text-stone-600">Last updated: {LAST_UPDATED}</p>

        <section className="prose mt-8 max-w-none text-stone-800">
          <p className="text-base leading-7">
            Justin's Travel Blog is a personal travel blog operated by Justin Cornetta. This
            policy describes what information the site collects, how it is used, and the choices
            you have. This is a low-volume personal project, not a business.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Information we collect</h2>
          <p className="mt-3 text-base leading-7">
            When you choose to subscribe to SMS updates at{" "}
            <a className="underline" href="/subscribe">
              /subscribe
            </a>
            , we collect:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-base leading-7">
            <li>
              <strong>Your mobile phone number</strong>, which you provide voluntarily so we can
              send you SMS notifications.
            </li>
            <li>
              <strong>The timestamps</strong> of when you consented, confirmed, and (if applicable)
              unsubscribed.
            </li>
            <li>
              <strong>Delivery records</strong> tracking whether each message we sent to your
              number succeeded or failed, used for diagnostics only.
            </li>
          </ul>
          <p className="mt-3 text-base leading-7">
            The site does not use analytics cookies or third-party trackers, and we do not collect
            IP addresses or browser fingerprints.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Accounts, likes, and comments</h2>
          <p className="mt-3 text-base leading-7">
            You can optionally create an account at{" "}
            <a className="underline" href="/account">/account</a> to like and comment on posts. When
            you register we collect your <strong>first and last name</strong>, <strong>email
            address</strong>, a <strong>password</strong> (stored only as a salted hash by our
            authentication provider, Supabase — we never see it), and an <strong>optional phone
            number</strong> if you choose to also receive SMS alerts.
          </p>
          <p className="mt-3 text-base leading-7">
            Comments you post are <strong>public</strong> and are shown alongside{" "}
            <strong>your name</strong> and the time you posted. Likes are private counts; we do not
            publicly display who liked a post. You can delete your own comments at any time, and you
            can request deletion of your entire account and associated data by emailing{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">How we use your phone number</h2>
          <p className="mt-3 text-base leading-7">
            Your phone number is used solely to send you SMS teasers when the blog publishes a
            new city update and a one-time confirmation message when you first sign up. That is
            the entire purpose.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">
            We do not share or sell mobile information
          </h2>
          <p className="mt-3 text-base leading-7">
            <strong>
              We do not share your mobile phone number or any SMS-related information with third
              parties or affiliates for marketing or promotional purposes.
            </strong>{" "}
            Mobile data is processed only by our SMS delivery provider (Twilio) for the sole
            purpose of transmitting the messages you opted in to receive. Twilio is bound by
            their own privacy commitments and acts as a service provider, not a data sharing
            partner.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Message frequency</h2>
          <p className="mt-3 text-base leading-7">
            Messages are sent only when a new city goes live on the public map — typically once
            every few days during active travel, with possible quieter weeks between cities.
            Expected frequency is fewer than 5 messages per week, often less.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Costs</h2>
          <p className="mt-3 text-base leading-7">
            Subscribing is free. <strong>Message and data rates may apply</strong> depending on
            your mobile carrier and plan. Justin's Travel Blog does not charge you anything.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Opting out</h2>
          <p className="mt-3 text-base leading-7">
            You can stop receiving messages at any time by replying{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">STOP</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">UNSUBSCRIBE</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">CANCEL</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">END</code>, or{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5">QUIT</code> to any message we
            send. We process opt-outs automatically and you will not receive further messages.
            You may also email{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>{" "}
            to request opt-out.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Data retention</h2>
          <p className="mt-3 text-base leading-7">
            Active subscriber records are retained while your subscription is active. If you
            unsubscribe, we keep the record of your opt-out (your number plus the unsubscribe
            timestamp) to ensure we do not message you again, but we do not use it for any other
            purpose. You may request full deletion by emailing{" "}
            <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
            .
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Security</h2>
          <p className="mt-3 text-base leading-7">
            Subscriber data is stored in a Supabase database accessible only via an authenticated
            service role key. Access is restricted to the site operator. The site uses HTTPS
            everywhere.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Changes to this policy</h2>
          <p className="mt-3 text-base leading-7">
            If this policy materially changes, we will post the updated version at this URL with
            a new &quot;Last updated&quot; date.
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-stone-950">Contact</h2>
          <p className="mt-3 text-base leading-7">
            Questions about this policy? Email{" "}
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
