import { describe, expect, it } from "vitest";
import { bundledDemoAssetUrl } from "@/lib/data/bundled-demo-assets";
import { resolveSessionDemoAssetUrl } from "@/lib/data/session-demo-assets";
import { hydrateDemoSessionLibrary } from "@/lib/data/session-library";
import { TODAY_SESSION } from "@/lib/workout";
import type { Session } from "@/lib/workout";

describe("resolveSessionDemoAssetUrl", () => {
  it("resolves a bundled slug to the public webm path", () => {
    expect(resolveSessionDemoAssetUrl(null, "back-squat")).toBe(
      "/exercise-demos/back-squat.webm",
    );
    expect(resolveSessionDemoAssetUrl(undefined, "rdl")).toBe(
      bundledDemoAssetUrl("rdl"),
    );
  });

  it("prefers a joined Storage / seed URL over the bundled fallback", () => {
    const uploaded =
      "https://example.supabase.co/storage/v1/object/public/exercise-demos/rdl.webm?v=9";
    expect(resolveSessionDemoAssetUrl(uploaded, "rdl")).toBe(uploaded);
    expect(
      resolveSessionDemoAssetUrl("/exercise-demos/lunge.webm", "lunge"),
    ).toBe("/exercise-demos/lunge.webm");
  });

  it("stays null for front-squat and any slug without files", () => {
    expect(resolveSessionDemoAssetUrl(null, "front-squat")).toBeNull();
    expect(resolveSessionDemoAssetUrl("", "front-squat")).toBeNull();
    expect(resolveSessionDemoAssetUrl(null, "no-such-lift")).toBeNull();
    expect(resolveSessionDemoAssetUrl(null, null)).toBeNull();
  });
});

describe("hydrateDemoSessionLibrary", () => {
  it("attaches bundled loops to TODAY_SESSION lifts without mutating the source", () => {
    const hydrated = hydrateDemoSessionLibrary(TODAY_SESSION);

    expect(TODAY_SESSION.exercises[0].library).toBeUndefined();
    expect(hydrated.exercises).toHaveLength(TODAY_SESSION.exercises.length);
    expect(hydrated.exercises[0].sets).toHaveLength(
      TODAY_SESSION.exercises[0].sets.length,
    );

    const squat = hydrated.exercises.find((e) => e.name === "Back Squat");
    expect(squat?.library?.slug).toBe("back-squat");
    expect(squat?.library?.demoAssetUrl).toBe(
      "/exercise-demos/back-squat.webm",
    );
    expect(squat?.library?.cues.length).toBeGreaterThan(0);
    expect(squat?.library?.phases?.length).toBeGreaterThan(0);

    const rdl = hydrated.exercises.find((e) => e.name === "Romanian Deadlift");
    expect(rdl?.library?.demoAssetUrl).toBe("/exercise-demos/rdl.webm");
  });

  it("leaves front-squat demoAssetUrl null and unknown names library-less", () => {
    const session: Session = {
      ...TODAY_SESSION,
      exercises: [
        {
          id: "ex-fs",
          name: "Front Squat",
          sets: [{ id: "s1", targetReps: 5, targetWeight: 80 }],
        },
        {
          id: "ex-free",
          name: "Coach typed this",
          cue: "Hold it tight.",
          sets: [{ id: "s2", targetReps: 8, targetWeight: 20 }],
        },
      ],
    };

    const hydrated = hydrateDemoSessionLibrary(session);
    expect(hydrated.exercises[0].library?.slug).toBe("front-squat");
    expect(hydrated.exercises[0].library?.demoAssetUrl).toBeNull();
    expect(hydrated.exercises[1].library).toBeUndefined();
    expect(hydrated.exercises[1].cue).toBe("Hold it tight.");
  });
});
