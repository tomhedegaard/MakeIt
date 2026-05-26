/**
 * Unit tests for reason-narratives helpers.
 *
 * Two batches:
 *   - Exhaustive coverage of REASON_LABELS and ACTION_LABELS so a
 *     new reason code or action added to the engine without a
 *     matching label fails the test (rather than silently rendering
 *     the snake_case identifier in the UI).
 *   - narrateRule examples for each major engine path so the rule
 *     copy stays under review when we iterate on phrasing.
 */

import { describe, expect, it } from "vitest";

import {
  labelForAction,
  labelForReason,
  narrateRule,
} from "./reason-narratives";
import type { AdaptiveAction, RuleReasonCode } from "./types";

// Source of truth for coverage tests. If the engine adds a new
// RuleReasonCode / AdaptiveAction, update these arrays and the
// coverage test below will fail until labels are added.
const ALL_REASONS: RuleReasonCode[] = [
  "opt_out",
  "no_reading",
  "stale_reading",
  "warmup_incomplete",
  "no_next_session",
  "sick_marker",
  "hrv_very_low",
  "hrv_low",
  "low_sleep",
  "recent_alcohol",
  "low_feeling",
  "rpe_overshoot",
  "rpe_drift_rising",
  "missed_sessions",
  "sustained_low_readiness",
  "form_check_concern",
  "unusual_signal_combination",
  "no_actionable_signals",
];

const ALL_ACTIONS: AdaptiveAction[] = [
  "no_change",
  "top_set_reduction",
  "volume_reduction",
  "paused_session",
  "deload_week_insertion",
  "exercise_swap_variant",
  "session_shorten",
  "escalate_to_coach",
];

// =====================================================================
// Coverage
// =====================================================================

describe("labelForReason", () => {
  it("returns non-empty Danish text for every RuleReasonCode", () => {
    for (const code of ALL_REASONS) {
      const label = labelForReason(code);
      expect(label.length).toBeGreaterThan(0);
      // Snake_case fallback would contain underscores. Real labels
      // shouldn't.
      expect(label).not.toContain("_");
    }
  });

  it("falls back to the raw code for unknown reason", () => {
    expect(labelForReason("totally_made_up")).toBe("totally_made_up");
  });

  it("renders specific labels for the lifestyle signals (UI uses them as chips)", () => {
    expect(labelForReason("low_sleep")).toBe("Kort søvn");
    expect(labelForReason("recent_alcohol")).toBe("Alkohol seneste dage");
    expect(labelForReason("low_feeling")).toBe("Lav energi");
  });

  it("renders the HRV severity signals distinctly", () => {
    expect(labelForReason("hrv_low")).toBe("HRV lav");
    expect(labelForReason("hrv_very_low")).toBe("HRV meget lav");
  });
});

describe("labelForAction", () => {
  it("returns non-empty Danish text for every AdaptiveAction", () => {
    for (const action of ALL_ACTIONS) {
      const label = labelForAction(action);
      expect(label.length).toBeGreaterThan(0);
      expect(label).not.toContain("_");
    }
  });

  it("falls back to the raw action for unknown value", () => {
    expect(labelForAction("invent_a_new_action")).toBe("invent_a_new_action");
  });

  it("escalation actions read as member-facing copy, not engine-internal", () => {
    expect(labelForAction("escalate_to_coach")).toBe("coach gennemgår");
    expect(labelForAction("deload_week_insertion")).toBe(
      "deload-uge anbefalet"
    );
    expect(labelForAction("paused_session")).toBe("session pauset");
  });
});

// =====================================================================
// narrateRule
// =====================================================================

describe("narrateRule — engine path examples", () => {
  it("HRV low + low sleep → top set reduction", () => {
    expect(
      narrateRule({
        action: "top_set_reduction",
        reasons: ["hrv_low", "low_sleep"],
      })
    ).toBe("HRV lav + Kort søvn → topsæt-vægt reduceret");
  });

  it("HRV low + alcohol + feeling → top set reduction (3 lifestyle reasons)", () => {
    expect(
      narrateRule({
        action: "top_set_reduction",
        reasons: ["hrv_low", "low_sleep", "recent_alcohol", "low_feeling"],
      })
    ).toBe(
      "HRV lav + Kort søvn + Alkohol seneste dage + Lav energi → topsæt-vægt reduceret"
    );
  });

  it("HRV low alone → volume reduction", () => {
    expect(
      narrateRule({ action: "volume_reduction", reasons: ["hrv_low"] })
    ).toBe("HRV lav → accessory-volumen reduceret");
  });

  it("HRV very low → paused session", () => {
    expect(
      narrateRule({ action: "paused_session", reasons: ["hrv_very_low"] })
    ).toBe("HRV meget lav → session pauset");
  });

  it("sick marker → paused session", () => {
    expect(
      narrateRule({ action: "paused_session", reasons: ["sick_marker"] })
    ).toBe("Syg-markering → session pauset");
  });

  it("sustained low → deload week", () => {
    expect(
      narrateRule({
        action: "deload_week_insertion",
        reasons: ["sustained_low_readiness"],
      })
    ).toBe("Vedvarende lav HRV → deload-uge anbefalet");
  });

  it("sustained low + RPE drift → deload week (multi-reason)", () => {
    expect(
      narrateRule({
        action: "deload_week_insertion",
        reasons: ["sustained_low_readiness", "rpe_drift_rising"],
      })
    ).toBe(
      "Vedvarende lav HRV + RPE stiger over tid → deload-uge anbefalet"
    );
  });

  it("HRV low + form-check concern → swap variant", () => {
    expect(
      narrateRule({
        action: "exercise_swap_variant",
        reasons: ["hrv_low", "form_check_concern"],
      })
    ).toBe("HRV lav + Form-tilbageskridt → bytte til lettere variant");
  });

  it("RPE overshoot + missed sessions → shorten session", () => {
    expect(
      narrateRule({
        action: "session_shorten",
        reasons: ["rpe_overshoot", "missed_sessions"],
      })
    ).toBe(
      "Sidste session var hård + Missede sessions → session afkortet"
    );
  });

  it("unusual combination → escalate to coach", () => {
    expect(
      narrateRule({
        action: "escalate_to_coach",
        reasons: ["unusual_signal_combination", "hrv_low", "recent_alcohol"],
      })
    ).toBe(
      "Usædvanlig kombination + HRV lav + Alkohol seneste dage → coach gennemgår"
    );
  });
});

describe("narrateRule — edge cases", () => {
  it("empty reasons → renders just the action label", () => {
    expect(narrateRule({ action: "top_set_reduction", reasons: [] })).toBe(
      "topsæt-vægt reduceret"
    );
  });

  it("no_change with no reasons → just the action label", () => {
    expect(narrateRule({ action: "no_change", reasons: [] })).toBe(
      "ingen ændring"
    );
  });

  it("reasons preserve the order given (primary signal first)", () => {
    // hrv_low listed first matches the rule layer's emission order.
    const a = narrateRule({
      action: "top_set_reduction",
      reasons: ["hrv_low", "low_sleep"],
    });
    const b = narrateRule({
      action: "top_set_reduction",
      reasons: ["low_sleep", "hrv_low"],
    });
    expect(a).not.toBe(b);
    expect(a.indexOf("HRV lav")).toBeLessThan(a.indexOf("Kort søvn"));
    expect(b.indexOf("Kort søvn")).toBeLessThan(b.indexOf("HRV lav"));
  });
});
