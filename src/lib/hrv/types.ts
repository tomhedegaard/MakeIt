/** Source of an HRV reading. 'apple_health_sdnn' reserved for v2. */
export type HrvSource = "camera_ppg" | "polar_h10";

export type HrvConfidence = "high" | "medium" | "low";

/** Maturity of a member's baseline, derived from count of valid readings. */
export type WarmUpState = "discovery" | "provisional" | "active";

/** Readiness bucket — only meaningful when warmUpState === 'active'. */
export type ReadinessBucket =
  | "very_low"
  | "low"
  | "normal"
  | "high"
  | "very_high";

/** A single completed HRV reading with derived values. */
export interface HrvReading {
  id: string;
  memberId: string;
  measuredAt: string; // ISO timestamp
  source: HrvSource;
  confidence: HrvConfidence;
  rmssdMs: number;
  lnRmssd: number;
  meanHrBpm: number | null;
  rolling7dMeanLnRmssd: number | null;
  baseline60dMeanLnRmssd: number | null;
  baseline60dSwc: number | null;
  warmUpState: WarmUpState;
  readinessBucket: ReadinessBucket | null;
  timezone: string;
  isSick: boolean;
}

/** Quality metrics attached to a reading. */
export interface HrvQuality {
  ectopicPct: number;
  snrDb: number;
}
