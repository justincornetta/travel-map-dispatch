import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { WelcomeToast } from "@/components/WelcomeToast";
import { getSiteUrl } from "@/lib/env";

// Body / UI typeface. Exposed as the --font-inter CSS variable.
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Editorial heading typeface. Exposed as the --font-fraunces CSS variable.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const description =
  "Follow the trip through an interactive map, photos, and short dispatches.";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Justin's Travel Blog",
    template: "%s · Justin's Travel Blog",
  },
  description,
  openGraph: {
    title: "Justin's Travel Blog",
    description,
    siteName: "Justin's Travel Blog",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Justin's Travel Blog",
    description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-full bg-[#f6f3ec] text-stone-950">
        {children}
        <WelcomeToast />
      </body>
    </html>
  );
}
