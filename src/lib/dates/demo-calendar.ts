/**
 * Dates for demo fixtures (Crew challenge, leaderboard month, the IRL
 * meet), derived from today so the demo never shows a past month.
 */
export function demoCalendar(now: Date = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  // The meet: first Saturday at least three weeks out.
  const meet = new Date(y, m, now.getDate() + 21);
  meet.setDate(meet.getDate() + ((6 - meet.getDay() + 7) % 7));
  return { month: new Date(y, m, 1), daysLeft: lastDay - now.getDate(), meet };
}

/** "oktober" / "October" for the given locale tag. */
export function monthName(d: Date, tag: string): string {
  return d.toLocaleDateString(tag, { month: "long" });
}

/** "24/10". */
export function dayMonth(d: Date): string {
  return `${d.getDate()}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "Lørdag 24/10" / "Saturday 24/10". */
export function meetLabel(d: Date, tag: string): string {
  return `${capitalize(d.toLocaleDateString(tag, { weekday: "long" }))} ${dayMonth(d)}`;
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
