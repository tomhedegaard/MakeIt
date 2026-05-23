import type { HrvReading } from "./types";

/**
 * In-memory HRV reading store for demo mode (no Supabase).
 * Resets on every server restart — acceptable for demo/mock use.
 */
const store: HrvReading[] = [];

export function mockInsertReading(reading: HrvReading): void {
  store.push(reading);
}

export function mockListReadings(memberId: string): HrvReading[] {
  return store
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export function mockTodayReading(
  memberId: string,
  isoDate: string,
): HrvReading | null {
  return (
    mockListReadings(memberId).find((r) =>
      r.measuredAt.startsWith(isoDate),
    ) ?? null
  );
}
