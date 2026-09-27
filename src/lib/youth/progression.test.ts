import { describe, expect, it } from "vitest";
import { ADULT_PROGRESSION, YOUTH_PROGRESSION, progressWeek } from "@/lib/data/program-generator";

type Prev = Parameters<typeof progressWeek>[0];

function week(loggedRpe: number, loggedWeight = 20, targetWeight: number | null = null): Prev {
  return [
    {
      day_label: "Dag A",
      title: "Ben og skub",
      estimated_minutes: 45,
      exercises: [
        {
          exercise_name: "Goblet Squat",
          cue: "",
          position: 1,
          sets: [
            {
              position: 1,
              target_reps: 8,
              target_weight: targetWeight,
              target_rpe: 7,
              rest_sec: 90,
              logged_reps: 8,
              logged_weight: loggedWeight,
              logged_rpe: loggedRpe,
              logged_at: "2026-09-27T10:00:00Z",
            },
          ],
        },
      ],
    },
  ] as unknown as Prev;
}

const next = (prev: Prev, policy = ADULT_PROGRESSION) => progressWeek(prev, false, policy)[0].exercises[0].sets[0];

describe("progression policy (MakeIt Ung afsnit 3)", () => {
  // 2.5 % on top of the logged weight, rounded to 2.5 kg: 60 → 62.5.
  it("adds load for an adult at RPE 8", () => {
    expect(next(week(8, 60)).weight).toBe(62.5);
  });

  it("holds the weight for a young member above RPE 7.5", () => {
    expect(next(week(8, 60), YOUTH_PROGRESSION).weight).toBe(60);
  });

  it("still lets a young member progress gently from their own logged set", () => {
    expect(next(week(7, 60), YOUTH_PROGRESSION).weight).toBe(62.5);
  });

  it("never invents a kilo for a young set that has no target and no log", () => {
    const empty = week(7, 0, null);
    expect(next(empty, YOUTH_PROGRESSION).weight).toBe(0);
  });
});
