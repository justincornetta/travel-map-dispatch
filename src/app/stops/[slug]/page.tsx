import { notFound } from "next/navigation";

import { CityFeed } from "@/components/CityFeed";
import { getPublicStopBySlug } from "@/lib/data";

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const stop = await getPublicStopBySlug(slug);
  if (!stop) notFound();

  return <CityFeed stop={stop} />;
}
