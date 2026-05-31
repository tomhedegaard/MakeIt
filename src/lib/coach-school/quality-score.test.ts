import { describe, it, expect } from "vitest";
import {
  DEFAULT_DEMOTE_AGREEMENT_FLOOR,
  DEFAULT_MIN_REVIEWS_FOR_DEMOTE,
  DEFAULT_WATCH_SATISFACTION_FLOOR,
  decideQualityStatus,
} from "./quality-score";

const baseHealthy = {
  rollingAgreement: 0.9,
  reviewSampleSize: 80,
  memberSatisfaction: 4.5,
  satisfactionSampleSize: 25,
};

describe("decideQualityStatus", () => {
  it("returns 'healthy' / 'ok' when every gate passes with enough data", () => {
    const d = decideQualityStatus(baseHealthy);
    expect(d.status).toBe("healthy");
    expect(d.shouldDemote).toBe(false);
    expect(d.reason).toBe("ok");
  });

  it("returns 'demoted' when agreement is below floor AND sample size meets minimum", () => {
    const d = decideQualityStatus({
      ...baseHealthy,
      rollingAgreement: DEFAULT_DEMOTE_AGREEMENT_FLOOR - 0.01,
      reviewSampleSize: DEFAULT_MIN_REVIEWS_FOR_DEMOTE,
    });
    expect(d.status).toBe("demoted");
    expect(d.shouldDemote).toBe(true);
    expect(d.reason).toBe("agreement-below-floor");
  });

  it("does NOT demote when sample size is below the minimum, even if agreement is terrible", () => {
    const d = decideQualityStatus({
      ...baseHealthy,
      rollingAgreement: 0.0,
      reviewSampleSize: DEFAULT_MIN_REVIEWS_FOR_DEMOTE - 1,
    });
    expect(d.status).toBe("healthy");
    expect(d.shouldDemote).toBe(false);
    // Watch gate didn't trip either → reason flows to insufficient-data
    // unless satisfaction gate had enough samples.
    expect(["insufficient-data", "ok"]).toContain(d.reason);
  });

  it("returns 'watch' when satisfaction is below floor AND ratings meet minimum", () => {
    const d = decideQualityStatus({
      ...baseHealthy,
      memberSatisfaction: DEFAULT_WATCH_SATISFACTION_FLOOR - 0.5,
    });
    expect(d.status).toBe("watch");
    expect(d.shouldDemote).toBe(false);
    expect(d.reason).toBe("satisfaction-below-floor");
  });

  it("does NOT trip watch when ratings sample is too small", () => {
    const d = decideQualityStatus({
      ...baseHealthy,
      memberSatisfaction: 1.5,
      satisfactionSampleSize: 5,
    });
    expect(d.status).toBe("healthy");
    expect(d.shouldDemote).toBe(false);
  });

  it("demotion beats watch when both gates trip simultaneously", () => {
    const d = decideQualityStatus({
      rollingAgreement: 0.4,
      reviewSampleSize: 60,
      memberSatisfaction: 1.5,
      satisfactionSampleSize: 30,
    });
    expect(d.status).toBe("demoted");
    expect(d.shouldDemote).toBe(true);
    expect(d.reason).toBe("agreement-below-floor");
  });

  it("treats null rollingAgreement as 'cannot demote' regardless of sample size", () => {
    const d = decideQualityStatus({
      rollingAgreement: null,
      reviewSampleSize: 500,
      memberSatisfaction: null,
      satisfactionSampleSize: 0,
    });
    expect(d.status).toBe("healthy");
    expect(d.shouldDemote).toBe(false);
    expect(d.reason).toBe("insufficient-data");
  });

  it("respects custom thresholds", () => {
    const d = decideQualityStatus(
      {
        rollingAgreement: 0.7,
        reviewSampleSize: 100,
        memberSatisfaction: null,
        satisfactionSampleSize: 0,
      },
      { demoteAgreementFloor: 0.8, minReviewsForDemote: 50 },
    );
    expect(d.status).toBe("demoted");
    expect(d.shouldDemote).toBe(true);
  });

  it("exactly at the demote floor is not a demote (strict less-than)", () => {
    const d = decideQualityStatus({
      ...baseHealthy,
      rollingAgreement: DEFAULT_DEMOTE_AGREEMENT_FLOOR,
      reviewSampleSize: DEFAULT_MIN_REVIEWS_FOR_DEMOTE,
    });
    expect(d.status).toBe("healthy");
    expect(d.shouldDemote).toBe(false);
  });
});
