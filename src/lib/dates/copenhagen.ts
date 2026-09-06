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
