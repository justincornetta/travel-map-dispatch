import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "Travel Dispatch",
  description: "Follow the trip through an interactive map, photos, and short dispatches.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-full bg-[#f6f3ec] text-stone-950">{children}</body>
    </html>
  );
}
