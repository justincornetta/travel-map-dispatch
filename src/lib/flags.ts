// Maps the country names used by stops to their ISO-3166 alpha-2 codes, so the
// city feed + postcard can show a national-flag backdrop/stamp. Keys are
// lowercased; lookups are case-insensitive and trimmed. Add a line here if a
// new destination country comes up.

const COUNTRY_CODE: Record<string, string> = {
  "united states": "us",
  usa: "us",
  "united states of america": "us",
  america: "us",
  england: "gb",
  "united kingdom": "gb",
  uk: "gb",
  scotland: "gb",
  spain: "es",
  portugal: "pt",
  morocco: "ma",
  germany: "de",
  croatia: "hr",
  turkey: "tr",
  indonesia: "id",
  "hong kong": "hk",
  czechia: "cz",
  "czech republic": "cz",
  hungary: "hu",
  poland: "pl",
  greece: "gr",
  japan: "jp",
  "south korea": "kr",
  korea: "kr",
  thailand: "th",
  vietnam: "vn",
  taiwan: "tw",
  singapore: "sg",
};

/** ISO-3166 alpha-2 code for a country name, or null if we don't have one. */
export function countryCode(country: string | null | undefined): string | null {
  if (!country) return null;
  return COUNTRY_CODE[country.trim().toLowerCase()] ?? null;
}

/**
 * A wide flag image URL (flagcdn.com) for the given country name, used as a
 * blurred background layer / postage stamp. Returns null when the country isn't
 * recognised so callers can fall back to the plain theme.
 */
export function countryFlagUrl(country: string | null | undefined): string | null {
  const code = countryCode(country);
  return code ? `https://flagcdn.com/w1280/${code}.png` : null;
}
