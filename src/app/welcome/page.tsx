import type { Metadata } from "next";
import { Camera, Heart, MapPin, MessageSquareText } from "lucide-react";

import { AccountForms } from "@/components/AccountForms";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Sign in or create an account to follow the trip.",
};

export default function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center gap-8 px-4 py-10 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-10 lg:px-6">
      <section>
        <div className="mb-5 inline-flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-950 text-white">
            <MapPin className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold text-stone-950">Travel Dispatch</span>
        </div>

        <h1 className="max-w-xl font-serif text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
          Welcome to the travel blog
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-stone-700">
          Scroll through for a (mostly) unfiltered view of my travels across Europe and Asia. By
          signing up, you can like, comment, and get notified of new blog posts.
        </p>

        <ul className="mt-6 space-y-2.5 text-sm text-stone-700">
          <li className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Like the posts you enjoy
          </li>
          <li className="flex items-center gap-2">
            <MessageSquareText className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Comment with your name
          </li>
          <li className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-800" aria-hidden="true" /> Get notified when a new city goes live
          </li>
        </ul>
      </section>

      <div className="w-full">
        <AccountForms initialMode="register" />
      </div>
    </main>
  );
}
