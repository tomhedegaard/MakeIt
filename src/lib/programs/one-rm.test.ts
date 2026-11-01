import { describe, expect, it } from "vitest";
import { liftAnswerToOneRm, parseOneRmForm, scaleBlueprintDays, type OneRmInput } from "./one-rm";

const day = {
  exercises: [
    {
      exercise_name: "Back Squat",
      sets: [
        { reps: 5, weight: 80, rpe: null, rest_sec: 120 },
        { reps: 3, weight: 150, rpe: 8, rest_sec: 240 },
      ],
    },
    { exercise_name: "Romanian Deadlift", sets: [{ reps: 8, weight: 100, rpe: null }] },
    { exercise_name: "Bench Press", sets: [{ reps: 5, weight: 100, rpe: 8 }] },
    { exercise_name: "Pull-up", sets: [{ reps: 8, weight: 0, rpe: null }] },
  ],
};

const all = (v: number | null): OneRmInput => ({ squat: v, bench: v, deadlift: v, ohp: v });

describe("scaleBlueprintDays", () => {
  it("scales main lifts by member e1RM over the blueprint top set", () => {
    // Top set 150 × 3 @ 8 → 150 × (1 + 5/30) = 175 reference.
    const [out] = scaleBlueprintDays([day], { ...all(null), squat: 100, bench: 70 });
    const squat = out.exercises[0].sets as { weight: number }[];
    expect(squat.map((s) => s.weight)).toEqual([45, 85]);
  });

  it("leaves 'har ikke løftet det' empty and keeps bodyweight sets", () => {
    const [out] = scaleBlueprintDays([day], all(null));
    expect((out.exercises[0].sets as { weight: unknown }[])[1].weight).toBeNull();
    expect((out.exercises[1].sets as { weight: unknown }[])[0].weight).toBeNull();
    expect((out.exercises[3].sets as { weight: unknown }[])[0].weight).toBe(0);
  });

  it("scales accessories by the mean ratio and never puts a main lift below the bar", () => {
    const [out] = scaleBlueprintDays([day], { ...all(null), squat: 35, bench: 35 });
    expect((out.exercises[0].sets as { weight: number }[])[0].weight).toBe(20);
    // ratios 35/175 and 35/(100 × 1.2333) → mean ≈ 0.242 → RDL 24.2 → 22.5.
    expect((out.exercises[1].sets as { weight: number }[])[0].weight).toBe(22.5);
  });

  it("keeps the blueprint when no main lift has a reference", () => {
    const days = [{ exercises: [day.exercises[1]] }];
    expect(scaleBlueprintDays(days, all(100))).toBe(days);
  });
});

describe("onboarding answers", () => {
  it("reads a known max, a heavy set via Epley, and 'none'", () => {
    expect(liftAnswerToOneRm({ mode: "max", max: "120" })).toBe(120);
    expect(liftAnswerToOneRm({ mode: "set", setKg: "100", setReps: "5" })).toBe(116.7);
    expect(liftAnswerToOneRm({ mode: "none" })).toBeNull();
  });

  it("rejects missing or out-of-range answers", () => {
    expect(liftAnswerToOneRm({ mode: null })).toBeUndefined();
    expect(liftAnswerToOneRm({ mode: "max", max: "" })).toBeUndefined();
    expect(liftAnswerToOneRm({ mode: "set", setKg: "100", setReps: "12" })).toBeUndefined();
    const form: Record<string, string> = { squatMode: "max", squatMax: "100", benchMode: "none", deadliftMode: "none" };
    expect(parseOneRmForm((k) => form[k] ?? null)).toBeNull();
    form.ohpMode = "set";
    form.ohpSetKg = "50";
    form.ohpSetReps = "3";
    expect(parseOneRmForm((k) => form[k] ?? null)).toEqual({ squat: 100, bench: null, deadlift: null, ohp: 55 });
  });
});
