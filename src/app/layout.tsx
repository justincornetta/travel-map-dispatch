import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-[#f6f3ec] text-stone-950">{children}</body>
    </html>
  );
}
