import type { EngineInput } from "@/lib/adaptive/types";
// ReadinessBucket bor i hrv-typerne. adaptive/types re-eksporterer den ikke.
import type { ReadinessBucket } from "@/lib/hrv/types";
import { explainerScenarioInput } from "@/lib/adaptive/mock-scenarios";

/**
 * Landingens bro til den rigtige motor (spec 2026-09-18 §3).
 *
 * Reglerne bor i `@/lib/adaptive/engine`. Her oversættes kun tre
 * skyder-værdier til et `EngineInput`. Grundlaget er det testlåste
 * scenarie fra `/hrv/learn/adaptive`, og præcis tre felter overskrives.
 * Rør ikke `measuredAt` eller `now`: scenariets par (05:30 og 07:00)
 * holder målingen frisk. Sættes `measuredAt` til rigtig nutid, bliver
 * alderen negativ, og motoren svarer `stale_reading` ved hver eneste
 * skyder-position.
 */
export type DemoSliders = {
  /** Timer, 3,0-9,0 i spring på 0,5. */
  sleep: number;
  /** Millisekunder, 42-86. Se HRV_RANGE. */
  hrv: number;
  /** 1-5. */
  stress: number;
};

export const HRV_RANGE = { min: 42, max: 86 } as const;
export const SLEEP_RANGE = { min: 3, max: 9, step: 0.5 } as const;

/** Standardtilstanden giver en sænkning, så første indtryk ikke er en tom skærm. */
export const DEMO_DEFAULTS: DemoSliders = { sleep: 5, hrv: 46, stress: 4 };

/**
 * Demo-bånd. Appen har ingen absolutte ms-grænser: `classifyReadiness`
 * måler dit eget snit mod din egen baseline. Det her er landingens
 * fiktion, så et tal fra et ur kan bruges. `very_low` og `very_high`
 * er uden for skyderens rækkevidde (spec §3.3).
 */
export function bucketFor(hrv: number): ReadinessBucket {
  if (hrv < 52) return "low";
  if (hrv <= 74) return "normal";
  return "high";
}

export function buildDemoInput(sliders: DemoSliders): EngineInput {
  const base = explainerScenarioInput();
  return {
    ...base,
    latestReading: base.latestReading
      ? { ...base.latestReading, readinessBucket: bucketFor(sliders.hrv) }
      : base.latestReading,
    lifestyle: {
      ...base.lifestyle,
      sleepHoursAvg2d: sliders.sleep,
      feelingLast3d: sliders.stress >= 4 ? "stressed" : null,
    },
  };
}
