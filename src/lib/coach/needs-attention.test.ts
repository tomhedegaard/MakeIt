import { describe, expect, it } from "vitest";
import {
  bucketCounts,
  buildNeedsAttention,
  demoNeedsAttention,
} from "./needs-attention";

describe("needs-attention", () => {
  it("builds three buckets with athlete + lift language and deep-links", () => {
    const model = buildNeedsAttention({
      skipped: [
        {
          id: "s1",
          memberId: "m-anders",
          memberHandle: "anders",
          lift: "Squat",
          detail: "sprang Dag A",
        },
      ],
      pendingForm: [
        {
          id: "fc-1",
          memberId: "m-nina",
          memberHandle: "nina_dl",
          exerciseName: "Conventional Deadlift",
          setIndex: 2,
        },
      ],
      engineFlags: [
        {
          id: "e1",
          memberId: "m-kasper",
          memberHandle: "kasper_s",
          lift: "Back Squat",
          detail: "stall · RPE-drift",
        },
      ],
    });

    expect(model.sprunget).toHaveLength(1);
    expect(model.afventerForm).toHaveLength(1);
    expect(model.engine).toHaveLength(1);

    expect(model.sprunget[0]).toMatchObject({
      bucket: "sprunget",
      memberHandle: "anders",
      lift: "Squat",
      href: "/coach/members/m-anders",
    });
    expect(model.afventerForm[0]).toMatchObject({
      bucket: "afventer_form",
      memberHandle: "nina_dl",
      lift: "Conventional Deadlift · sæt 2",
      href: "/coach/queue#form-fc-1",
    });
    expect(model.engine[0]).toMatchObject({
      bucket: "engine",
      memberHandle: "kasper_s",
      lift: "Back Squat",
      href: "/coach/queue#engine-e1",
    });
  });

  it("demo synthetics fill all three buckets without compliance or churn %", () => {
    const model = demoNeedsAttention();
    const counts = bucketCounts(model);

    expect(counts.sprunget).toBeGreaterThanOrEqual(1);
    expect(counts.afventerForm).toBeGreaterThanOrEqual(1);
    expect(counts.engine).toBeGreaterThanOrEqual(1);

    const blob = JSON.stringify(model);
    expect(blob).not.toMatch(/compliance/i);
    expect(blob).not.toMatch(/churn/i);
    expect(blob).not.toMatch(/\d+%/);
    expect(blob).toContain("nina_dl");
    expect(blob).toContain("Deadlift");
  });

  it("drops reviewed form-checks from Afventer form", () => {
    const model = buildNeedsAttention({
      skipped: [],
      pendingForm: [
        {
          id: "done",
          memberId: "m-1",
          memberHandle: "x",
          exerciseName: "RDL",
          setIndex: 1,
        },
      ],
      engineFlags: [],
    });
    expect(model.afventerForm).toHaveLength(1);
  });
});
