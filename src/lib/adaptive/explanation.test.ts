/**
 * Unit tests for describeAdaptation — the pure helper that shapes
 * the AdaptationCard's labels from a persisted modifier row.
 */

import { describe, expect, it } from "vitest";

import { describeAdaptation } from "./explanation";

describe("describeAdaptation — automatic actions", () => {
  it("top_set_reduction signed off by engine", () => {
    const result = describeAdaptation({
      modifierType: "top_set_reduction",
      reviewedBy: "auto",
      acceptedByMember: null,
    });
    expect(result.eyebrow).toBe("Topsæt-vægt reduceret");
    expect(result.attribution).toBe("Automatisk · baseret på din HRV");
    expect(result.pendingCoach).toBe(false);
    expect(result.showAcceptCTA).toBe(true);
  });

  it("volume_reduction shows accept CTA when no response yet", () => {
    const result = describeAdaptation({
      modifierType: "volume_reduction",
      reviewedBy: "auto",
      acceptedByMember: null,
    });
    expect(result.showAcceptCTA).toBe(true);
  });

  it("hides CTA once member has responded", () => {
    expect(
      describeAdaptation({
        modifierType: "volume_reduction",
        reviewedBy: "auto",
        acceptedByMember: true,
      }).showAcceptCTA
    ).toBe(false);
    expect(
      describeAdaptation({
        modifierType: "volume_reduction",
        reviewedBy: "auto",
        acceptedByMember: false,
      }).showAcceptCTA
    ).toBe(false);
  });

  it("exercise_swap_variant + session_shorten use action-specific eyebrows", () => {
    expect(
      describeAdaptation({
        modifierType: "exercise_swap_variant",
        reviewedBy: "auto",
        acceptedByMember: null,
      }).eyebrow
    ).toBe("Øvelse byttet");
    expect(
      describeAdaptation({
        modifierType: "session_shorten",
        reviewedBy: "auto",
        acceptedByMember: null,
      }).eyebrow
    ).toBe("Session afkortet");
  });
});

describe("describeAdaptation — escalations", () => {
  it("paused_session unreviewed → coach-pending tone, no CTA", () => {
    const result = describeAdaptation({
      modifierType: "paused_session",
      reviewedBy: null,
      acceptedByMember: null,
    });
    expect(result.pendingCoach).toBe(true);
    expect(result.eyebrow).toBe("Coach gennemgår dagens session");
    expect(result.attribution).toBe("Afventer Munks godkendelse");
    expect(result.showAcceptCTA).toBe(false);
  });

  it("paused_session reviewed by Munk → final tone", () => {
    const result = describeAdaptation({
      modifierType: "paused_session",
      reviewedBy: "munk",
      acceptedByMember: null,
    });
    expect(result.pendingCoach).toBe(false);
    expect(result.eyebrow).toBe("Dagens session er på pause");
    expect(result.attribution).toBe("Tilpasset af Munk");
    expect(result.showAcceptCTA).toBe(false);
  });

  it("deload_week_insertion reviewed", () => {
    const result = describeAdaptation({
      modifierType: "deload_week_insertion",
      reviewedBy: "munk",
      acceptedByMember: null,
    });
    expect(result.eyebrow).toBe("Munks anbefaling: deload-uge");
    expect(result.showAcceptCTA).toBe(false);
  });

  it("escalate_to_coach reviewed by co-coach", () => {
    const result = describeAdaptation({
      modifierType: "escalate_to_coach",
      reviewedBy: "co_coach:abc-123",
      acceptedByMember: null,
    });
    expect(result.attribution).toBe("Tilpasset af coach");
    expect(result.pendingCoach).toBe(false);
    expect(result.showAcceptCTA).toBe(false);
  });
});
