/**
 * `occurred_on` is a real-world calendar date (`format: date`), not an
 * instant. `new Date("2026-07-26")` parses it as **UTC midnight**, which
 * renders as July 25th for anyone in a negative-offset zone — every user in
 * Brazil, the US, and Canada. So calendar dates stay strings, and a local
 * `Date` is constructed only where `Intl` needs one.
 *
 * `created_at` is a genuine instant (`format: date-time`) and carries a
 * distinct type, so the two cannot be swapped by accident.
 */
export type CalendarDate = string & { readonly __brand: "CalendarDate" };
export type Instant = string & { readonly __brand: "Instant" };

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: string): value is CalendarDate {
  const match = CALENDAR_DATE.exec(value);
  if (!match) return false;

  const [, year, month, day] = match;
  const probe = new Date(Number(year), Number(month) - 1, Number(day));

  // Round-tripping catches impossible dates: JS rolls 2026-02-30 forward to
  // March 2nd, so the parts no longer match.
  return (
    probe.getFullYear() === Number(year) &&
    probe.getMonth() === Number(month) - 1 &&
    probe.getDate() === Number(day)
  );
}

export function toCalendarDate(value: string): CalendarDate | null {
  return isCalendarDate(value) ? value : null;
}

/** Builds a **local** Date, never a UTC one. */
function localDateFrom(value: CalendarDate): Date {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year!, month! - 1, day!);
}

export function formatCalendarDate(
  value: CalendarDate,
  locale: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(localDateFrom(value));
}

/** Today, in the user's own timezone — the date they would write down. */
export function todayCalendarDate(): CalendarDate {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` as CalendarDate;
}

/** Formats a real instant, with its time, in the viewer's timezone. */
export function formatInstant(value: string, locale: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
