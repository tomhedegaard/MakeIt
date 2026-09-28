/**
 * Unit tests for the Priority Inbox pure merge (A2).
 *
 * Covers kind rank, timestamp tie-break, stale bucket filter, hrefs,
 * empty input, and never-trained stale rows.
 */

import { describe, expect, it } from "vitest";

import {
  hrefForInboxKind,
  isInboxStaleBucket,
  KIND_RANK,
  mergePriorityInbox,
  type PriorityInboxInputs,
} from "./priority-inbox";

const NOW = new Date("2026-09-03T08:00:00.000Z");

function inputs(
  overrides: Partial<PriorityInboxInputs> = {},
): PriorityInboxInputs {
  return {
    mentalSafety: [],
    hrvAlerts: [],
    adaptive: [],
    formChecks: [],
    stale: [],
    now: NOW,
    ...overrides,
  };
}

describe("hrefForInboxKind", () => {
  it("routes each kind to the act surface", () => {
    expect(hrefForInboxKind("mental_safety", "m1")).toBe("/coach/safety");
    expect(hrefForInboxKind("hrv_alert", "m1")).toBe("/coach/queue");
    expect(hrefForInboxKind("adaptive", "m1")).toBe("/coach/queue");
    expect(hrefForInboxKind("form_check", "m1")).toBe("/coach/queue");
    expect(hrefForInboxKind("stale_session", "m1")).toBe("/coach/members/m1");
  });
});

describe("isInboxStaleBucket", () => {
  it("keeps atRisk and inactive, drops active and slowing", () => {
    expect(isInboxStaleBucket("atRisk")).toBe(true);
    expect(isInboxStaleBucket("inactive")).toBe(true);
    expect(isInboxStaleBucket("active")).toBe(false);
    expect(isInboxStaleBucket("slowing")).toBe(false);
  });
});

describe("mergePriorityInbox — empty", () => {
  it("returns an empty list when nothing is open", () => {
    expect(mergePriorityInbox(inputs())).toEqual([]);
  });
});

describe("mergePriorityInbox — rank", () => {
  it("orders kinds mental → hrv → adaptive → form-check → stale", () => {
    const items = mergePriorityInbox(
      inputs({
        stale: [
          {
            id: "m-stale",
            handle: "anders",
            daysSinceLastSession: 22,
            bucket: "atRisk",
          },
        ],
        formChecks: [
          {
            id: "fc-1",
            memberId: "m-fc",
            memberHandle: "nina_dl",
            createdAt: "2026-09-02T10:00:00.000Z",
            exerciseName: "Deadlift",
          },
        ],
        adaptive: [
          {
            alertId: "ad-1",
            memberId: "m-ad",
            memberHandle: "kasper_s",
            triggeredAt: "2026-09-03T06:00:00.000Z",
            action: "escalate_to_coach",
          },
        ],
        hrvAlerts: [
          {
            id: "hrv-1",
            memberId: "m-hrv",
            memberHandle: "maria.lift",
            triggeredAt: "2026-09-03T05:00:00.000Z",
          },
        ],
        mentalSafety: [
          {
            id: "ms-1",
            memberId: "m-ms",
            memberHandle: "signe",
            createdAt: "2026-09-03T07:00:00.000Z",
          },
        ],
      }),
    );
    expect(items.map((i) => i.kind)).toEqual([
      "mental_safety",
      "hrv_alert",
      "adaptive",
      "form_check",
      "stale_session",
    ]);
    expect(KIND_RANK.mental_safety).toBe(0);
    expect(KIND_RANK.stale_session).toBe(4);
  });

  it("keeps two rows for the same member when the actions differ", () => {
    const items = mergePriorityInbox(
      inputs({
        formChecks: [
          {
            id: "fc-1",
            memberId: "m-nina",
            memberHandle: "nina_dl",
            createdAt: "2026-09-02T10:00:00.000Z",
            exerciseName: "Deadlift",
          },
        ],
        hrvAlerts: [
          {
            id: "hrv-1",
            memberId: "m-nina",
            memberHandle: "nina_dl",
            triggeredAt: "2026-09-03T05:00:00.000Z",
          },
        ],
      }),
    );
    expect(items).toHaveLength(2);
    expect(items.every((i) => i.memberId === "m-nina")).toBe(true);
  });
});

describe("mergePriorityInbox — timestamps", () => {
  it("sorts mental / hrv / adaptive newest first", () => {
    const items = mergePriorityInbox(
      inputs({
        mentalSafety: [
          {
            id: "old",
            memberId: "a",
            memberHandle: "a",
            createdAt: "2026-09-01T00:00:00.000Z",
          },
          {
            id: "new",
            memberId: "b",
            memberHandle: "b",
            createdAt: "2026-09-03T00:00:00.000Z",
          },
        ],
      }),
    );
    expect(items.map((i) => i.id)).toEqual([
      "mental_safety:new",
      "mental_safety:old",
    ]);
  });

  it("sorts form-checks oldest first (longest wait)", () => {
    const items = mergePriorityInbox(
      inputs({
        formChecks: [
          {
            id: "newer",
            memberId: "a",
            memberHandle: "a",
            createdAt: "2026-09-03T00:00:00.000Z",
            exerciseName: "Squat",
          },
          {
            id: "older",
            memberId: "b",
            memberHandle: "b",
            createdAt: "2026-09-01T00:00:00.000Z",
            exerciseName: "Bench",
          },
        ],
      }),
    );
    expect(items.map((i) => i.id)).toEqual([
      "form_check:older",
      "form_check:newer",
    ]);
  });

  it("sorts stale by days-since descending; never-trained last", () => {
    const items = mergePriorityInbox(
      inputs({
        stale: [
          {
            id: "never",
            handle: "ghost",
            daysSinceLastSession: null,
            bucket: "inactive",
          },
          {
            id: "mild",
            handle: "oliver",
            daysSinceLastSession: 17,
            bucket: "atRisk",
          },
          {
            id: "loud",
            handle: "anders",
            daysSinceLastSession: 22,
            bucket: "atRisk",
          },
        ],
      }),
    );
    expect(items.map((i) => i.memberHandle)).toEqual([
      "anders",
      "oliver",
      "ghost",
    ]);
    expect(items[2].reasonKey).toBe("chipStaleNever");
  });
});

describe("mergePriorityInbox — mapping", () => {
  it("drops slowing / active stale rows", () => {
    const items = mergePriorityInbox(
      inputs({
        stale: [
          {
            id: "slow",
            handle: "frederik",
            daysSinceLastSession: 12,
            bucket: "slowing",
          },
          {
            id: "hot",
            handle: "nina_dl",
            daysSinceLastSession: 1,
            bucket: "active",
          },
          {
            id: "risk",
            handle: "anders",
            daysSinceLastSession: 22,
            bucket: "atRisk",
          },
        ],
      }),
    );
    expect(items).toHaveLength(1);
    expect(items[0].memberHandle).toBe("anders");
  });

  it("sets reason keys, params, and hrefs", () => {
    const items = mergePriorityInbox(
      inputs({
        mentalSafety: [
          {
            id: "ms-1",
            memberId: "m-ms",
            memberHandle: "signe",
            createdAt: "2026-09-03T07:00:00.000Z",
          },
        ],
        formChecks: [
          {
            id: "fc-1",
            memberId: "m-fc",
            memberHandle: "nina_dl",
            createdAt: "2026-09-02T10:00:00.000Z",
            exerciseName: "Deadlift",
          },
        ],
        adaptive: [
          {
            alertId: "ad-1",
            memberId: "m-ad",
            memberHandle: "kasper_s",
            triggeredAt: "2026-09-03T06:00:00.000Z",
            action: "paused_session",
          },
        ],
        stale: [
          {
            id: "m-stale",
            handle: "anders",
            daysSinceLastSession: 22,
            bucket: "atRisk",
            lastSessionAt: "2026-08-12T18:00:00.000Z",
          },
        ],
      }),
    );
    const byKind = Object.fromEntries(items.map((i) => [i.kind, i]));
    expect(byKind.mental_safety).toMatchObject({
      reasonKey: "chipMentalSafety",
      href: "/coach/safety",
    });
    expect(byKind.form_check).toMatchObject({
      reasonKey: "chipFormCheck",
      reasonParams: { exercise: "Deadlift" },
      href: "/coach/queue",
    });
    expect(byKind.adaptive).toMatchObject({
      reasonKey: "chipAdaptive",
      reasonParams: { action: "paused_session" },
    });
    expect(byKind.stale_session).toMatchObject({
      reasonKey: "chipStale",
      reasonParams: { days: 22 },
      href: "/coach/members/m-stale",
      occurredAt: "2026-08-12T18:00:00.000Z",
    });
  });

  it("falls back form-check exercise to empty string", () => {
    const [row] = mergePriorityInbox(
      inputs({
        formChecks: [
          {
            id: "fc-1",
            memberId: "m",
            memberHandle: "x",
            createdAt: "2026-09-02T10:00:00.000Z",
            exerciseName: null,
          },
        ],
      }),
    );
    expect(row.reasonKey).toBe("chipFormCheckFallback");
    expect(row.reasonParams).toBeUndefined();
  });
});
