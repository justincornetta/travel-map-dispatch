export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return "Dates TBD";

  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const format = (value: string) => formatter.format(new Date(`${value}T12:00:00`));

  if (start && end) return `${format(start)} - ${format(end)}`;
  if (start) return `Arrived ${format(start)}`;
  return `Until ${format(end as string)}`;
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
