/**
 * In-memory limits for the public chat. Each server instance keeps its
 * own counts, so this is a brake on one visitor hammering the endpoint
 * and a ceiling on what a single instance can spend, not a global
 * guarantee. A Vercel Firewall rate-limit rule on /api/ask-hq is the
 * global layer.
 */
export type Limits = {
  /** Messages per visitor inside `windowMs`. */
  perVisitor: number;
  windowMs: number;
  /** Messages per visitor per day. */
  perDay: number;
  /** Messages per instance per hour, across all visitors. */
  perInstanceHour: number;
};

export const ASK_HQ_LIMITS: Limits = {
  perVisitor: 10,
  windowMs: 5 * 60_000,
  perDay: 40,
  perInstanceHour: 600,
};

const DAY = 24 * 60 * 60_000;
const HOUR = 60 * 60_000;

export function createLimiter(limits: Limits = ASK_HQ_LIMITS) {
  const visitors = new Map<string, number[]>();
  let instance: number[] = [];

  return function allow(key: string, now = Date.now()): boolean {
    instance = instance.filter((t) => now - t < HOUR);
    if (instance.length >= limits.perInstanceHour) return false;

    const hits = (visitors.get(key) ?? []).filter((t) => now - t < DAY);
    const recent = hits.filter((t) => now - t < limits.windowMs);
    if (recent.length >= limits.perVisitor || hits.length >= limits.perDay) {
      visitors.set(key, hits);
      return false;
    }

    hits.push(now);
    instance.push(now);
    visitors.set(key, hits);

    // Keep the map from growing without bound on a long-lived instance.
    if (visitors.size > 5000) {
      for (const [k, v] of visitors) if (!v.some((t) => now - t < DAY)) visitors.delete(k);
    }
    return true;
  };
}
