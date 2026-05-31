/**
 * Crew Coaching Pyramid — quality-score decision logic (CC-8).
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Pure: no DB, no React. The weekly cron (CC-8) computes rolling
 * metrics per live co-coach then calls `decideQualityStatus` to
 * label the snapshot and decide whether to demote.
 *
 * Why a separate pure function: the thresholds (0.65 agreement,
 * 3.0/5 satisfaction, sample-size floors) are the levers Munk will
 * want to tune. Keeping the decision off the cron route + DB layer
 * means we can unit-test edge cases without spinning up Supabase
 * and we can tweak thresholds without re-reading the cron code.
 *
 * Status definitions (snapshot row.status):
 *   - 'demoted' — agreement floor breached AND we have enough live
 *     reviews to trust the signal. Cron demotes coach_tier
 *     beast_live → beast_sandbox and ends co-coach assignments.
 *   - 'watch'   — satisfaction floor breached AND we have enough
 *     ratings to trust the signal. No tier change; we email the
 *     coach and Munk so they can coach the co-coach back up.
 *   - 'healthy' — nothing breached, or sample sizes too small to
 *     act on. The neutral case.
 *
 * Sample-size floors prevent two cliff-edge mistakes:
 *   - Demoting a brand-new live co-coach on 3 unlucky reviews.
 *   - Putting someone on watch from a single grumpy thumb-down.
 *
 * Precedence: demotion beats watch when both trigger — a co-coach
 * whose agreement collapsed AND whose members are unhappy is a tier
 * problem, not a coaching-the-coach problem.
 */

/** v0 thresholds — promote knobs to ENV later if we want to tune in prod. */
export const DEFAULT_DEMOTE_AGREEMENT_FLOOR = 0.65;
export const DEFAULT_WATCH_SATISFACTION_FLOOR = 3.0;
export const DEFAULT_MIN_REVIEWS_FOR_DEMOTE = 50;
export const DEFAULT_MIN_RATINGS_FOR_WATCH = 10;

export type QualityStatus = "healthy" | "watch" | "demoted";

export interface QualityMetrics {
  /** Rolling avg agreement_score in [0,1], or null when not yet measurable. */
  rollingAgreement: number | null;
  /** Sample size that produced rollingAgreement (null-scores excluded upstream). */
  reviewSampleSize: number;
  /** Avg member-satisfaction (1–5), null when no ratings infra is live yet. */
  memberSatisfaction: number | null;
  /** Number of ratings that produced memberSatisfaction. */
  satisfactionSampleSize: number;
}

export interface QualityThresholds {
  demoteAgreementFloor?: number;
  watchSatisfactionFloor?: number;
  minReviewsForDemote?: number;
  minRatingsForWatch?: number;
}

export interface QualityDecision {
  status: QualityStatus;
  shouldDemote: boolean;
  /** Machine-readable reason — drives the email copy + cron logs. */
  reason:
    | "agreement-below-floor"
    | "satisfaction-below-floor"
    | "insufficient-data"
    | "ok";
}

/**
 * Decide what to do with a co-coach this week based on their rolling
 * metrics. See module jsdoc for status semantics.
 */
export function decideQualityStatus(
  metrics: QualityMetrics,
  thresholds: QualityThresholds = {},
): QualityDecision {
  const demoteFloor =
    thresholds.demoteAgreementFloor ?? DEFAULT_DEMOTE_AGREEMENT_FLOOR;
  const watchFloor =
    thresholds.watchSatisfactionFloor ?? DEFAULT_WATCH_SATISFACTION_FLOOR;
  const minReviews =
    thresholds.minReviewsForDemote ?? DEFAULT_MIN_REVIEWS_FOR_DEMOTE;
  const minRatings =
    thresholds.minRatingsForWatch ?? DEFAULT_MIN_RATINGS_FOR_WATCH;

  // Demotion gate — precedence over watch.
  if (
    metrics.rollingAgreement !== null &&
    metrics.reviewSampleSize >= minReviews &&
    metrics.rollingAgreement < demoteFloor
  ) {
    return {
      status: "demoted",
      shouldDemote: true,
      reason: "agreement-below-floor",
    };
  }

  // Watch gate.
  if (
    metrics.memberSatisfaction !== null &&
    metrics.satisfactionSampleSize >= minRatings &&
    metrics.memberSatisfaction < watchFloor
  ) {
    return {
      status: "watch",
      shouldDemote: false,
      reason: "satisfaction-below-floor",
    };
  }

  // Nothing tripped. Two healthy sub-cases for log clarity:
  //   - We had enough data and everything passed → 'ok'
  //   - We didn't have enough data to judge either way → 'insufficient-data'
  const hadEnoughDataForAnyJudgment =
    (metrics.rollingAgreement !== null &&
      metrics.reviewSampleSize >= minReviews) ||
    (metrics.memberSatisfaction !== null &&
      metrics.satisfactionSampleSize >= minRatings);

  return {
    status: "healthy",
    shouldDemote: false,
    reason: hadEnoughDataForAnyJudgment ? "ok" : "insufficient-data",
  };
}
