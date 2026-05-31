/**
 * Lifestyle-event helpers — pure constants, types, and validation for the
 * `hrv_lifestyle_logs` table. Members log daily lifestyle context (alcohol,
 * sleep, mood, late meals, illness, cycle start); this layer narrows and
 * normalizes the untrusted `value` jsonb before it reaches the server action
 * or the database. No IO. See spec §6.
 */

/** The six lifestyle event types stored in `hrv_lifestyle_logs.event_type`. */
export const LIFESTYLE_EVENT_TYPES = [
  "alcohol_drinks",
  "sleep_hours",
  "feeling",
  "late_meal",
  "sick",
  "menstrual_start",
] as const;

/** Union of the six valid `event_type` strings. */
export type LifestyleEventType = (typeof LIFESTYLE_EVENT_TYPES)[number];

/** The four self-reported feeling states for the `feeling` event. */
export const FEELING_STATES = ["fresh", "ok", "tired", "stressed"] as const;

/** Union of the four valid feeling-state strings. */
export type FeelingState = (typeof FEELING_STATES)[number];

/** `value` jsonb shape for `alcohol_drinks` — integer 0..3 (3 means "3+"). */
export interface AlcoholDrinksValue {
  count: number;
}
/** `value` jsonb shape for `sleep_hours` — hours 0..24. */
export interface SleepHoursValue {
  hours: number;
}
/** `value` jsonb shape for `feeling`. */
export interface FeelingValue {
  state: FeelingState;
}
/** `value` jsonb shape for `late_meal`. */
export interface LateMealValue {
  late: boolean;
}
/** `value` jsonb shape for `sick`. */
export interface SickValue {
  sick: boolean;
}
/** `value` jsonb shape for `menstrual_start` — a `YYYY-MM-DD` date string. */
export interface MenstrualStartValue {
  date: string;
}

/** Mapping from each event type to its normalized `value` object shape. */
export interface LifestyleValueMap {
  alcohol_drinks: AlcoholDrinksValue;
  sleep_hours: SleepHoursValue;
  feeling: FeelingValue;
  late_meal: LateMealValue;
  sick: SickValue;
  menstrual_start: MenstrualStartValue;
}

/** Discriminated union of all normalized lifestyle `value` objects. */
export type LifestyleValue = LifestyleValueMap[LifestyleEventType];

/** Narrow an unknown value to a plain (non-null) object record. */
function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("lifestyle value must be an object");
  }
  return value as Record<string, unknown>;
}

/** Clamp `n` into the inclusive range [`min`, `max`]. */
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * True when `s` is a real calendar date in strict `YYYY-MM-DD` form — it must
 * match the pattern AND round-trip through `Date` unchanged (rejecting e.g.
 * `2026-13-99` or `2026-02-30`, which `Date` would otherwise roll over).
 */
function isValidIsoDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [year, month, day] = s.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

/**
 * Validate and normalize the untrusted `value` for a lifestyle event.
 *
 * Returns a typed, normalized `value` object: numeric fields are clamped to
 * their valid range, `alcohol_drinks.count` is additionally rounded to an
 * integer. Throws an `Error` with a descriptive message when `eventType` is
 * unknown or `value` does not match the expected shape. Pure — no IO.
 */
export function validateLifestyleValue(
  eventType: string,
  value: unknown,
): LifestyleValue {
  switch (eventType) {
    case "alcohol_drinks": {
      const rec = asRecord(value);
      const count = rec.count;
      if (typeof count !== "number" || !Number.isFinite(count)) {
        throw new Error("alcohol_drinks.count must be a finite number");
      }
      return { count: clamp(Math.round(count), 0, 3) };
    }
    case "sleep_hours": {
      const rec = asRecord(value);
      const hours = rec.hours;
      if (typeof hours !== "number" || !Number.isFinite(hours)) {
        throw new Error("sleep_hours.hours must be a finite number");
      }
      return { hours: clamp(hours, 0, 24) };
    }
    case "feeling": {
      const rec = asRecord(value);
      const state = rec.state;
      if (
        typeof state !== "string" ||
        !(FEELING_STATES as readonly string[]).includes(state)
      ) {
        throw new Error(
          `feeling.state must be one of: ${FEELING_STATES.join(", ")}`,
        );
      }
      return { state: state as FeelingState };
    }
    case "late_meal": {
      const rec = asRecord(value);
      const late = rec.late;
      if (typeof late !== "boolean") {
        throw new Error("late_meal.late must be a boolean");
      }
      return { late };
    }
    case "sick": {
      const rec = asRecord(value);
      const sick = rec.sick;
      if (typeof sick !== "boolean") {
        throw new Error("sick.sick must be a boolean");
      }
      return { sick };
    }
    case "menstrual_start": {
      const rec = asRecord(value);
      const date = rec.date;
      if (typeof date !== "string" || !isValidIsoDate(date)) {
        throw new Error(
          "menstrual_start.date must be a valid YYYY-MM-DD calendar date",
        );
      }
      return { date };
    }
    default:
      throw new Error(`unknown lifestyle event type: ${eventType}`);
  }
}
