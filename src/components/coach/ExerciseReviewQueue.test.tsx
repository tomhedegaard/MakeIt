import { describe, expect, it, vi } from "vitest";
import { render } from "../marketing/test-render";
import type { Exercise } from "@/lib/data/exercises";

vi.mock("@/app/coach/exercises/actions", () => ({ setExercisePublishedAction: vi.fn() }));

const { default: ExerciseReviewQueue } = await import("./ExerciseReviewQueue");

const draft = (over: Partial<Exercise>): Exercise => ({
  id: "1",
  slug: "band-curl",
  name: "Band curl",
  category: "arme",
  pattern: null,
  equipment: "elastik",
  difficulty: "beginner",
  primaryMuscles: ["biceps"],
  secondaryMuscles: ["forearms"],
  tertiaryMuscles: [],
  cues: ["Albuerne ind til kroppen"],
  mistakes: [{ title: "Svinger", body: "Hold overkroppen stille." }],
  whyMatters: "Isoleret armarbejde.",
  setup: null,
  progression: null,
  regression: null,
  demoAssetUrl: "https://example.test/exercise-demos/band-curl.webm",
  videoUrl: null,
  thumbnailUrl: null,
  displayOrder: 1,
  isPublished: false,
  phases: [],
  ...over,
});

describe("ExerciseReviewQueue", () => {
  it("shows the first draft with its loop, muscles, coaching text and the two decisions", () => {
    const html = render(<ExerciseReviewQueue drafts={[draft({}), draft({ id: "2", slug: "b", name: "B" })]} />);
    expect(html).toContain("1 af 2");
    expect(html).toContain("Band curl");
    expect(html).toContain('src="https://example.test/exercise-demos/band-curl.webm"');
    expect(html).toContain('poster="https://example.test/exercise-demos/band-curl-poster.jpg"');
    expect(html).toContain("Biceps");
    expect(html).toContain("Underarme");
    expect(html).toContain("Albuerne ind til kroppen");
    expect(html).toContain("Svinger");
    expect(html).toMatch(/>Godkend<\/button>/);
    expect(html).toMatch(/>Spring over<\/button>/);
    expect(html).toContain('href="/coach/exercises/band-curl"');
  });

  it("says so when there is nothing to review", () => {
    expect(render(<ExerciseReviewQueue drafts={[]} />)).toContain("Ingen kladder at gennemgå.");
  });
});
