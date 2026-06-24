import { parse, isValid, format } from "date-fns";

// NZ-format parsers. Seed/import data uses DD/MM/YYYY dates and 12-hour times
// like "2:30:00 PM". These return null on anything unparseable rather than
// throwing, so a bad cell never breaks an import.

const DATE_FORMATS = ["dd/MM/yyyy", "d/M/yyyy", "dd/MM/yy", "d/M/yy"];
const TIME_FORMATS = ["h:mm:ss a", "h:mm a", "hh:mm:ss a", "hh:mm a", "HH:mm:ss", "HH:mm"];

/**
 * Parse "19/06/2026" → Date anchored at UTC midnight, or null.
 *
 * These are calendar dates (no time-of-day), so we anchor at UTC midnight.
 * That keeps the stored ISO date equal to the intended day regardless of the
 * server/machine timezone. Always render with `formatDate` (which reads UTC).
 */
export function parseNzDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  for (const fmt of DATE_FORMATS) {
    const d = parse(v, fmt, new Date(2000, 0, 1));
    if (isValid(d)) {
      return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    }
  }
  return null;
}

/** Build a UTC-midnight calendar date from a yyyy-MM-dd input value. */
export function dateFromInputValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

/** Format a stored calendar date for display (read in UTC to avoid shifting). */
export function formatDate(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "";
  return new Intl.DateTimeFormat("en-NZ", { ...opts, timeZone: "UTC" }).format(d);
}

/**
 * Format a real instant (e.g. a note's createdAt) in local time. Unlike
 * `formatDate`, this does NOT pin to UTC — these are timestamps, not calendar dates.
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  },
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "";
  return new Intl.DateTimeFormat("en-NZ", opts).format(d);
}

/** yyyy-MM-dd value for <input type="date">, read in UTC. */
export function toInputDateValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "";
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Convert a stored display time ("2:30 PM") to a 24h value for <input type="time">. */
export function toInputTimeValue(value: string | null | undefined): string {
  if (!value) return "";
  for (const fmt of ["h:mm a", "h:mm:ss a", "HH:mm", "HH:mm:ss"]) {
    const d = parse(value.trim(), fmt, new Date(2000, 0, 1));
    if (isValid(d)) return format(d, "HH:mm");
  }
  return "";
}

// The app's local timezone. Calendar dates are stored at UTC midnight, but
// "today" must be judged in NZ time — the server runs in UTC, ~12h behind NZ,
// so using UTC would keep a just-passed viewing in "upcoming" for half a day.
export const APP_TIME_ZONE = "Pacific/Auckland";

/**
 * Start of "today" (in APP_TIME_ZONE) as a UTC-midnight epoch ms — directly
 * comparable to a calendar date stored via parseNzDate/dateFromInputValue.
 */
export function todayUtcMs(timeZone: string = APP_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  return Date.UTC(get("year"), get("month") - 1, get("day"));
}

/** Normalise "2:30:00 PM" → "2:30 PM", or null. */
export function parseNzTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  for (const fmt of TIME_FORMATS) {
    const d = parse(v, fmt, new Date(2000, 0, 1));
    if (isValid(d)) return format(d, "h:mm a");
  }
  // Couldn't parse — keep the raw value so we don't silently lose it.
  return v;
}
