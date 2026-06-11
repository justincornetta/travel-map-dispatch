// Maps the country names used in the city catalog (src/lib/cities.ts) to their
// ISO-3166 alpha-2 codes, so the city feed can show a subtle national-flag
// backdrop. Scoped to the countries that actually appear in CITY_OPTIONS.

const COUNTRY_CODE: Record<string, string> = {
  "United Kingdom": "gb",
  Spain: "es",
  Portugal: "pt",
  Germany: "de",
  Croatia: "hr",
  Turkey: "tr",
  Indonesia: "id",
  "Hong Kong": "hk",
  Czechia: "cz",
  Hungary: "hu",
  Poland: "pl",
  Greece: "gr",
  Japan: "jp",
  "South Korea": "kr",
  Thailand: "th",
  Vietnam: "vn",
  Taiwan: "tw",
  Singapore: "sg",
};

/** ISO-3166 alpha-2 code for a country name, or null if we don't have one. */
export function countryCode(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_CODE[country.trim()] ?? null;
}

/**
 * A wide flag image URL (flagcdn.com) for the given country name, used as a
 * blurred background layer. Returns null when the country isn't recognised so
 * callers can fall back to the plain dark theme.
 */
export function countryFlagUrl(country: string | null | undefined): string | null {
  const code = countryCode(country);
  return code ? `https://flagcdn.com/w1280/${code}.png` : null;
}
