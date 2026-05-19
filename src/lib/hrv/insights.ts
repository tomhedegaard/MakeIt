/**
 * HRV weekly-insights correlation engine — pure functions that turn a week's
 * readings and lifestyle logs into two-group RMSSD comparisons plus a
 * deterministic Danish template summary.
 *
 * Pure: no IO, no LLM, no React. Later V2.2 tasks (cron job, server action,
 * UI cards) consume this layer. See spec §7.
 */
import type { AlcoholDrinksValue, SleepHoursValue } from "./lifestyle";

/** A lifestyle factor V2.2 correlates against HRV. */
export type InsightFactor = "alcohol" | "sleep";

/** One correlation card — a two-group RMSSD comparison for a factor. */
export interface CorrelationCard {
  factor: InsightFactor;
  status: "ok" | "insufficient_data";
  exposedN: number;
  baselineN: number;
  exposedMeanRmssd: number | null;
  baselineMeanRmssd: number | null;
  deltaPct: number | null;
}

/** Week-over-week summary figures. */
export interface WeekStats {
  weekMeanRmssd: number | null;
  priorWeekMeanRmssd: number | null;
  weekReadingCount: number;
}

/** A reading reduced to what the engine needs. */
export interface InsightReading {
  date: string;
  lnRmssd: number;
}

/** A lifestyle log reduced to what the engine needs. */
export interface InsightLog {
  date: string;
  eventType: string;
  value: unknown;
}

export interface InsightInput {
  readings: InsightReading[];
  lifestyleLogs: InsightLog[];
  weekStart: string;
}

export interface InsightData {
  weekStart: string;
  weekStats: WeekStats;
  correlationCards: CorrelationCard[];
}

/** Minimum days in each group before a card is statistically reportable. */
const MIN_GROUP_N = 4;

/** Milliseconds in one day. */
const MS_PER_DAY = 86_400_000;

/**
 * Monday (UTC) of the ISO week containing `date`, as `YYYY-MM-DD`.
 *
 * ISO convention: Sunday is the last day of its week. The Sunday-evening cron
 * passes `now`; this returns the Monday of the just-completed Mon–Sun week.
 */
export function weekStartFor(date: Date): string {
  const dow = date.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const daysSinceMonday = (dow + 6) % 7;
  const monday = new Date(date.getTime() - daysSinceMonday * MS_PER_DAY);
  return monday.toISOString().slice(0, 10);
}

/** Parse a `YYYY-MM-DD` string, add `n` days, return a `YYYY-MM-DD` string. */
function addDays(dateStr: string, n: number): string {
  const ms = Date.parse(`${dateStr}T00:00:00Z`) + n * MS_PER_DAY;
  return new Date(ms).toISOString().slice(0, 10);
}

/**
 * Geometric mean of an RMSSD population given its `lnRmssd` values:
 * `round(exp(mean(lnValues)))`. Returns `null` for an empty array. The single
 * source of rounding for every mean in this module.
 */
function geoMeanRmssd(lnValues: number[]): number | null {
  if (lnValues.length === 0) return null;
  const sum = lnValues.reduce((acc, v) => acc + v, 0);
  return Math.round(Math.exp(sum / lnValues.length));
}

/** Either group a classified log day falls into, or `skip` (excluded). */
type Classification = "exposed" | "baseline" | "skip";

interface FactorConfig {
  factor: InsightFactor;
  eventType: string;
  pairOffsetDays: number;
  classify: (value: unknown) => Classification;
}

const FACTOR_CONFIG: readonly FactorConfig[] = [
  {
    factor: "alcohol",
    eventType: "alcohol_drinks",
    pairOffsetDays: 1,
    classify: (value) => {
      const count = (value as AlcoholDrinksValue).count;
      if (count === 0) return "baseline";
      if (count === 2 || count === 3) return "exposed";
      return "skip"; // count === 1 — ambiguous middle
    },
  },
  {
    factor: "sleep",
    eventType: "sleep_hours",
    pairOffsetDays: 0,
    classify: (value) => {
      const hours = (value as SleepHoursValue).hours;
      if (typeof hours !== "number") return "skip";
      return hours < 7 ? "exposed" : "baseline";
    },
  },
] as const;

/** Build one correlation card from the readings paired against its logs. */
function buildCard(
  config: FactorConfig,
  logs: InsightLog[],
  readingByDate: Map<string, number>,
): CorrelationCard {
  const exposed: number[] = [];
  const baseline: number[] = [];

  for (const log of logs) {
    if (log.eventType !== config.eventType) continue;
    const group = config.classify(log.value);
    if (group === "skip") continue;
    const pairedDate = addDays(log.date, config.pairOffsetDays);
    const lnRmssd = readingByDate.get(pairedDate);
    if (lnRmssd === undefined) continue; // no paired reading — drop the log
    (group === "exposed" ? exposed : baseline).push(lnRmssd);
  }

  const exposedN = exposed.length;
  const baselineN = baseline.length;
  const sufficient = exposedN >= MIN_GROUP_N && baselineN >= MIN_GROUP_N;

  if (!sufficient) {
    return {
      factor: config.factor,
      status: "insufficient_data",
      exposedN,
      baselineN,
      exposedMeanRmssd: null,
      baselineMeanRmssd: null,
      deltaPct: null,
    };
  }

  const exposedMeanRmssd = geoMeanRmssd(exposed) as number;
  const baselineMeanRmssd = geoMeanRmssd(baseline) as number;
  const deltaPct = Math.round(
    ((exposedMeanRmssd - baselineMeanRmssd) / baselineMeanRmssd) * 100,
  );

  return {
    factor: config.factor,
    status: "ok",
    exposedN,
    baselineN,
    exposedMeanRmssd,
    baselineMeanRmssd,
    deltaPct,
  };
}

/**
 * Turn a week's readings and lifestyle logs into week-over-week stats and the
 * fixed `[alcohol, sleep]` correlation cards.
 */
export function buildInsightData(input: InsightInput): InsightData {
  const { readings, lifestyleLogs, weekStart } = input;

  // O(1) date → lnRmssd lookup; last reading on a date wins.
  const readingByDate = new Map<string, number>();
  for (const r of readings) readingByDate.set(r.date, r.lnRmssd);

  const weekEnd = addDays(weekStart, 7); // exclusive upper bound
  const priorStart = addDays(weekStart, -7); // inclusive lower bound

  const weekLn: number[] = [];
  const priorLn: number[] = [];
  for (const r of readings) {
    if (r.date >= weekStart && r.date < weekEnd) {
      weekLn.push(r.lnRmssd);
    } else if (r.date >= priorStart && r.date < weekStart) {
      priorLn.push(r.lnRmssd);
    }
  }

  const weekStats: WeekStats = {
    weekMeanRmssd: geoMeanRmssd(weekLn),
    priorWeekMeanRmssd: geoMeanRmssd(priorLn),
    weekReadingCount: weekLn.length,
  };

  const correlationCards = FACTOR_CONFIG.map((config) =>
    buildCard(config, lifestyleLogs, readingByDate),
  );

  return { weekStart, weekStats, correlationCards };
}

/** Danish label for each factor, used in the template summary. */
const FACTOR_LABEL_DA: Record<InsightFactor, string> = {
  alcohol: "alkohol",
  sleep: "kort søvn",
};

/**
 * Deterministic Danish fallback summary — used when no LLM insight is
 * available. Always non-empty and free of `NaN`/`undefined`/`null` text.
 */
export function buildTemplateSummary(data: InsightData): string {
  const sentences: string[] = [];
  const { weekMeanRmssd, priorWeekMeanRmssd } = data.weekStats;

  if (weekMeanRmssd !== null) {
    let s = `Din gennemsnitlige HRV i sidste uge var ${weekMeanRmssd} ms.`;
    if (priorWeekMeanRmssd !== null) {
      const diff = weekMeanRmssd - priorWeekMeanRmssd;
      if (diff > 0) {
        s += ` Det er ${diff} ms højere end ugen før.`;
      } else if (diff < 0) {
        s += ` Det er ${-diff} ms lavere end ugen før.`;
      } else {
        s += " Det er uændret i forhold til ugen før.";
      }
    }
    sentences.push(s);
  } else {
    sentences.push(
      "Der var ingen HRV-målinger i sidste uge, så vi kan ikke vise et ugegennemsnit endnu.",
    );
  }

  const okCards = data.correlationCards.filter((c) => c.status === "ok");
  for (const card of okCards) {
    const label = FACTOR_LABEL_DA[card.factor];
    const pct = card.deltaPct as number;
    if (pct < 0) {
      sentences.push(
        `På dage med ${label} var din HRV ${Math.abs(pct)}% lavere.`,
      );
    } else if (pct > 0) {
      sentences.push(`På dage med ${label} var din HRV ${pct}% højere.`);
    } else {
      sentences.push(`${label} så ikke ud til at påvirke din HRV.`);
    }
  }

  if (okCards.length === 0) {
    sentences.push(
      "Vi har endnu ikke nok data til at vise sammenhænge med livsstil — fortsæt med at logge.",
    );
  }

  return sentences.join(" ");
}
