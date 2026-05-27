// Static city catalog for the admin dropdown.
// Coordinates and country names copied from /career-break-planning/app/travel.js + extra-destinations.js
// (the same dataset used to plan the trip itinerary).
//
// The slug is the canonical city identifier — used as the public URL segment (/stops/<slug>)
// and as the join key between the dropdown selection and the stops table.

export type CityOption = {
  slug: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
};

export const CITY_OPTIONS: CityOption[] = [
  // — Active itinerary (May 22 – Jul 14, 2026) —
  { slug: "london", city: "London", country: "United Kingdom", latitude: 51.5072, longitude: -0.1276 },
  { slug: "barcelona", city: "Barcelona", country: "Spain", latitude: 41.3874, longitude: 2.1686 },
  { slug: "granada", city: "Granada", country: "Spain", latitude: 37.1773, longitude: -3.5986 },
  { slug: "lisbon", city: "Lisbon", country: "Portugal", latitude: 38.7223, longitude: -9.1393 },
  { slug: "porto", city: "Porto", country: "Portugal", latitude: 41.1579, longitude: -8.6291 },
  { slug: "munich", city: "Munich", country: "Germany", latitude: 48.1351, longitude: 11.582 },
  { slug: "split", city: "Split", country: "Croatia", latitude: 43.5081, longitude: 16.4402 },
  { slug: "istanbul", city: "Istanbul", country: "Turkey", latitude: 41.0082, longitude: 28.9784 },
  { slug: "bali", city: "Bali", country: "Indonesia", latitude: -8.4095, longitude: 115.1889 },
  { slug: "hong-kong", city: "Hong Kong", country: "Hong Kong", latitude: 22.3193, longitude: 114.1694 },
  { slug: "pamplona", city: "Pamplona", country: "Spain", latitude: 42.8125, longitude: -1.6458 },

  // — Spillover / scenario alternatives —
  { slug: "berlin", city: "Berlin", country: "Germany", latitude: 52.52, longitude: 13.405 },
  { slug: "prague", city: "Prague", country: "Czechia", latitude: 50.0755, longitude: 14.4378 },
  { slug: "budapest", city: "Budapest", country: "Hungary", latitude: 47.4979, longitude: 19.0402 },
  { slug: "krakow", city: "Krakow", country: "Poland", latitude: 50.0647, longitude: 19.945 },
  { slug: "athens", city: "Athens", country: "Greece", latitude: 37.9838, longitude: 23.7275 },
  { slug: "cappadocia", city: "Cappadocia", country: "Turkey", latitude: 38.6431, longitude: 34.8289 },
  { slug: "tokyo", city: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503 },
  { slug: "kyoto", city: "Kyoto", country: "Japan", latitude: 35.0116, longitude: 135.7681 },
  { slug: "seoul", city: "Seoul", country: "South Korea", latitude: 37.5665, longitude: 126.978 },
  { slug: "bangkok", city: "Bangkok", country: "Thailand", latitude: 13.7563, longitude: 100.5018 },
  { slug: "chiang-mai", city: "Chiang Mai", country: "Thailand", latitude: 18.7883, longitude: 98.9853 },
  { slug: "hanoi", city: "Hanoi", country: "Vietnam", latitude: 21.0278, longitude: 105.8342 },
  { slug: "hoi-an", city: "Hoi An", country: "Vietnam", latitude: 15.8801, longitude: 108.338 },
  { slug: "ha-giang", city: "Ha Giang", country: "Vietnam", latitude: 22.8233, longitude: 104.9836 },
  { slug: "taipei", city: "Taipei", country: "Taiwan", latitude: 25.033, longitude: 121.5654 },
  { slug: "singapore", city: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198 },
];

const bySlug = new Map(CITY_OPTIONS.map((c) => [c.slug, c]));

export function getCityBySlug(slug: string): CityOption | undefined {
  return bySlug.get(slug);
}
