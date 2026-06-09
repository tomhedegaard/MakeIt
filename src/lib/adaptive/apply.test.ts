/**
 * Unit tests for applyAdaptationToSession — the pure transformation
 * that mutates a Session into its adapted shape before SessionClient
 * renders it.
 *
 * Strategy: one `baseSession()` factory returns a known session with
 * one main lift (top set 100kg @ RPE 8 + 2 backoff) and two accessory
 * exercises. Each test builds the relevant adaptation, applies it,
 * and asserts the targeted change. Untouched parts of the session
 * are also checked to confirm we don't accidentally mutate them.
 */

import { describe, expect, it } from "vitest";

import { applyAdaptationToSession } from "./apply";
import type { ActiveAdaptation } from "./explanation";
import type { AdaptiveAction } from "./types";
import type { Session } from "@/lib/workout";

function baseSession(): Session {
  return {
    id: "sess-1",
    programCode: "STR-12",
    programName: "PR-Block",
    week: 3,
    dayLabel: "Dag A — Squat",
    title: "Squat day",
    estimatedMinutes: 60,
    status: "active",
    exercises: [
      {
        id: "ex-squat",
        name: "Back squat",
        cue: "Bryst op, knæ ud.",
        sets: [
          { id: "s1", targetReps: 3, targetWeight: 100, targetRpe: 8 },
          { id: "s2", targetReps: 3, targetWeight: 87.5 },
          { id: "s3", targetReps: 3, targetWeight: 87.5 },
        ],
      },
      {
        id: "ex-rdl",
        name: "Romanian deadlift",
        sets: [
          { id: "r1", targetReps: 8, targetWeight: 60 },
          { id: "r2", targetReps: 8, targetWeight: 60 },
          { id: "r3", targetReps: 8, targetWeight: 60 },
        ],
      },
      {
        id: "ex-row",
        name: "Barbell row",
        sets: [
          { id: "b1", targetReps: 10, targetWeight: 50 },
          { id: "b2", targetReps: 10, targetWeight: 50 },
        ],
      },
    ],
  };
}

function adaptation(
  modifierType: AdaptiveAction,
  params: Record<string, unknown> = {},
  overrides: Partial<ActiveAdaptation> = {}
): ActiveAdaptation {
  return {
    modifierId: "mod-1",
    modifierType,
    explanationDa: "Adaption forklaring.",
    reviewedBy: "auto",
    acceptedByMember: null,
    params,
    ...overrides,
  };
}

// =====================================================================
// null adaptation
// =====================================================================

describe("applyAdaptationToSession — null adaptation", () => {
  it("returns a clone equal to the input session", () => {
    const out = applyAdaptationToSession(baseSession(), null);
    expect(out).toEqual(baseSession());
  });

  it("does not mutate the input", () => {
    const input = baseSession();
    const out = applyAdaptationToSession(input, null);
    out.exercises[0].name = "MODIFIED";
    expect(input.exercises[0].name).toBe("Back squat");
  });
});

// =====================================================================
// top_set_reduction
// =====================================================================

describe("applyAdaptationToSession — top_set_reduction", () => {
  it("reduces top set weight by percent and snaps to 2.5kg", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("top_set_reduction", { percent: 10 })
    );
    expect(out.exercises[0].sets[0].targetWeight).toBe(90);
    expect(out.exercises[0].sets[0].adapted).toEqual({
      kind: "weight_reduced",
      originalWeight: 100,
      percent: 10,
    });
  });

  it("snaps to nearest 2.5kg increment for fractional results", () => {
    const session = baseSession();
    session.exercises[0].sets[0].targetWeight = 102.5;
    const out = applyAdaptationToSession(
      session,
      adaptation("top_set_reduction", { percent: 10 })
    );
    // 102.5 × 0.9 = 92.25 → snapped to 92.5
    expect(out.exercises[0].sets[0].targetWeight).toBe(92.5);
  });

  it("does not modify backoff sets or accessory exercises", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("top_set_reduction", { percent: 10 })
    );
    expect(out.exercises[0].sets[1].targetWeight).toBe(87.5);
    expect(out.exercises[0].sets[1].adapted).toBeUndefined();
    expect(out.exercises[1].sets[0].targetWeight).toBe(60);
  });

  it("no-ops when percent is missing, zero, or unreasonable", () => {
    expect(
      applyAdaptationToSession(baseSession(), adaptation("top_set_reduction", {}))
        .exercises[0].sets[0].targetWeight
    ).toBe(100);
    expect(
      applyAdaptationToSession(
        baseSession(),
        adaptation("top_set_reduction", { percent: 0 })
      ).exercises[0].sets[0].targetWeight
    ).toBe(100);
    expect(
      applyAdaptationToSession(
        baseSession(),
        adaptation("top_set_reduction", { percent: 75 })
      ).exercises[0].sets[0].targetWeight
    ).toBe(100);
  });

  it("does not mutate input session", () => {
    const input = baseSession();
    applyAdaptationToSession(
      input,
      adaptation("top_set_reduction", { percent: 10 })
    );
    expect(input.exercises[0].sets[0].targetWeight).toBe(100);
  });
});

// =====================================================================
// volume_reduction
// =====================================================================

describe("applyAdaptationToSession — volume_reduction", () => {
  it("marks the last N accessory sets as optional, from the end", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("volume_reduction", { accessorySetsDropped: 2 })
    );
    // Last two accessory sets across exercises[1..]: row's b2 and b1.
    expect(out.exercises[2].sets[1].optional).toBe(true);
    expect(out.exercises[2].sets[0].optional).toBe(true);
    // RDL untouched.
    expect(out.exercises[1].sets[2].optional).toBeUndefined();
  });

  it("never marks main-lift sets as optional", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("volume_reduction", { accessorySetsDropped: 99 })
    );
    for (const set of out.exercises[0].sets) {
      expect(set.optional).toBeUndefined();
    }
  });

  it("degrades gracefully when count exceeds available accessory sets", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("volume_reduction", { accessorySetsDropped: 99 })
    );
    // All 5 accessory sets get marked.
    expect(out.exercises[1].sets.every((s) => s.optional)).toBe(true);
    expect(out.exercises[2].sets.every((s) => s.optional)).toBe(true);
  });

  it("no-ops when accessorySetsDropped is missing or 0", () => {
    expect(
      applyAdaptationToSession(baseSession(), adaptation("volume_reduction", {}))
        .exercises[2].sets[1].optional
    ).toBeUndefined();
    expect(
      applyAdaptationToSession(
        baseSession(),
        adaptation("volume_reduction", { accessorySetsDropped: 0 })
      ).exercises[2].sets[1].optional
    ).toBeUndefined();
  });
});

// =====================================================================
// session_shorten
// =====================================================================

describe("applyAdaptationToSession — session_shorten", () => {
  it("marks all accessory exercises as optional", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("session_shorten")
    );
    expect(out.exercises[0].optional).toBeUndefined();
    expect(out.exercises[1].optional).toBe(true);
    expect(out.exercises[2].optional).toBe(true);
  });

  it("preserves the main lift", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("session_shorten")
    );
    expect(out.exercises[0].name).toBe("Back squat");
    expect(out.exercises[0].sets.length).toBe(3);
  });
});

// =====================================================================
// exercise_swap_variant
// =====================================================================

describe("applyAdaptationToSession — exercise_swap_variant", () => {
  it("attaches swap_suggested marker with variantReason", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("exercise_swap_variant", {
        fromExerciseId: "ex-squat",
        toExerciseId: "ex-goblet",
        variantReason: "joint_friendly",
      })
    );
    expect(out.exercises[0].adapted).toEqual({
      kind: "swap_suggested",
      variantReason: "joint_friendly",
    });
    // Name still the original — actual swap UI lands in a later slice.
    expect(out.exercises[0].name).toBe("Back squat");
  });

  it("defaults to joint_friendly when reason is missing", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("exercise_swap_variant", {})
    );
    expect(out.exercises[0].adapted?.variantReason).toBe("joint_friendly");
  });
});

// =====================================================================
// paused_session
// =====================================================================

describe("applyAdaptationToSession — paused_session", () => {
  it("sets pausedReplacement with Danish copy when reviewed", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("paused_session", {}, { reviewedBy: "munk" })
    );
    expect(out.pausedReplacement).toBeDefined();
    expect(out.pausedReplacement?.title).toMatch(/Restitution/);
    expect(out.pausedReplacement?.body).toMatch(/10 min mobilitet/);
  });

  it("does NOT transform when escalation is still pending Munk", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("paused_session", {}, { reviewedBy: null })
    );
    expect(out.pausedReplacement).toBeUndefined();
    expect(out.exercises.length).toBe(3);
  });
});

// =====================================================================
// member-keep-original
// =====================================================================

describe("applyAdaptationToSession — member kept original", () => {
  it("returns clone unchanged when acceptedByMember is false", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation(
        "top_set_reduction",
        { percent: 10 },
        { acceptedByMember: false }
      )
    );
    expect(out.exercises[0].sets[0].targetWeight).toBe(100);
    expect(out.exercises[0].sets[0].adapted).toBeUndefined();
  });

  it("still applies when acceptedByMember is true (the default behaviour)", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation(
        "top_set_reduction",
        { percent: 10 },
        { acceptedByMember: true }
      )
    );
    expect(out.exercises[0].sets[0].targetWeight).toBe(90);
  });
});

// =====================================================================
// no-op actions
// =====================================================================

describe("applyAdaptationToSession — no-op actions", () => {
  it("deload_week_insertion leaves session untouched", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("deload_week_insertion", {}, { reviewedBy: "munk" })
    );
    expect(out).toEqual(baseSession());
  });

  it("escalate_to_coach leaves session untouched (reviewed)", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("escalate_to_coach", {}, { reviewedBy: "munk" })
    );
    expect(out).toEqual(baseSession());
  });

  it("no_change leaves session untouched", () => {
    const out = applyAdaptationToSession(
      baseSession(),
      adaptation("no_change")
    );
    expect(out).toEqual(baseSession());
  });
});
