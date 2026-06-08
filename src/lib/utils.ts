export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Earliest/latest plausible trip year. Anything outside this is almost
// certainly a typo (e.g. a mistyped year like "62026").
export const MIN_TRIP_DATE = "2000-01-01";
export const MAX_TRIP_DATE = "2100-12-31";

/**
 * True when `value` is empty (dates are optional) or a well-formed
 * YYYY-MM-DD in a sane year range. Rejects malformed years like
 * "62026-06-20" that would later crash date formatting.
 */
export function isValidDateInput(value: string | null | undefined): boolean {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 2000 && year <= 2100;
}

export function formatDateRange(start: string | null, end: string | null) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Guard against malformed/out-of-range dates (e.g. a mistyped year like
  // "62026-06-20"). Intl.DateTimeFormat.format throws "RangeError: Invalid
  // time value" on an Invalid Date, which would crash the whole page.
  const format = (value: string | null): string | null => {
    if (!value) return null;
    const d = new Date(`${value}T12:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    return formatter.format(d);
  };

  const startLabel = format(start);
  const endLabel = format(end);

  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`;
  if (startLabel) return `Arrived ${startLabel}`;
  if (endLabel) return `Until ${endLabel}`;
  return "Dates TBD";
}

export function statusLabel(status: string) {
  if (status === "current") return "Current";
  if (status === "upcoming") return "Upcoming";
  return "Visited";
}

export function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return "";
}
