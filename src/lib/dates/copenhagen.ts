/**
 * Europe/Copenhagen calendar day (YYYY-MM-DD).
 *
 * Pure date helper — no React, workout, or HRV imports. Shared by
 * dashboard Today prose and program materialize (`scheduled_for`) so
 * the Start Program server-action graph stays free of demo/UI modules.
 */
export function copenhagenTodayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const MS_PER_DAY = 86_400_000;

/** Add calendar days to a YYYY-MM-DD using date-only UTC math (DST-safe). */
export function isoPlusDays(iso: string, n: number): string {
  const start = Date.parse(`${iso}T00:00:00Z`);
  if (!Number.isFinite(start)) return iso;
  return new Date(start + n * MS_PER_DAY).toISOString().slice(0, 10);
}

/** ISO Monday (YYYY-MM-DD) of the week that contains `isoDate`. */
export function isoMondayOf(isoDate: string): string {
  const start = Date.parse(`${isoDate}T00:00:00Z`);
  if (!Number.isFinite(start)) return isoDate;
  const day = new Date(start).getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return isoPlusDays(isoDate, diff);
}

/** ISO Monday of the Europe/Copenhagen calendar week (not UTC). */
export function copenhagenIsoMonday(now: Date = new Date()): string {
  return isoMondayOf(copenhagenTodayIso(now));
}
