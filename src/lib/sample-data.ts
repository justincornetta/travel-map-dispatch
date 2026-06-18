import type { Stop } from "@/lib/types";

// Fallback data used only when Supabase env vars are missing. Real Supabase is
// configured now, so this is effectively dead code — kept to keep the type
// surface and dev-without-Supabase path working.
export const sampleStops: Stop[] = [
  {
    id: "demo-lisbon",
    title: "Lisbon",
    slug: "lisbon",
    city: "Lisbon",
    country: "Portugal",
    locationLabel: "Lisbon, Portugal",
    latitude: 38.7223,
    longitude: -9.1393,
    status: "visited",
    arrivalDate: "2026-06-02",
    departureDate: "2026-06-08",
    teaser: "Tile-covered streets, late dinners, and a first week of finding the trip's rhythm.",
    isPublished: true,
    notificationSent: true,
    posts: [
      {
        id: "demo-post-lisbon-1",
        stopId: "demo-lisbon",
        happenedAt: "2026-06-02T18:00:00Z",
        createdAt: "2026-06-02T18:00:00Z",
        sortOrder: 0,
        title: "First walk",
        body: "Steep streets, bright tiles, good coffee, and a slower pace than the airport version of myself expected.",
        photos: [
          {
            id: "demo-photo-lisbon",
            postId: "demo-post-lisbon-1",
            url: "/demo-lisbon.png",
            altText: "A warm Lisbon-inspired travel scene",
            displayOrder: 0,
            mediaType: "image",
            posterUrl: null,
          },
        ],
      },
    ],
    photos: [
      {
        id: "demo-photo-lisbon",
        postId: "demo-post-lisbon-1",
        url: "/demo-lisbon.png",
        altText: "A warm Lisbon-inspired travel scene",
        displayOrder: 0,
        mediaType: "image",
        posterUrl: null,
      },
    ],
    coverPhotoId: null,
    coverPhoto: null,
  },
];
