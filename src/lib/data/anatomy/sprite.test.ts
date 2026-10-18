import { describe, expect, it } from "vitest";
import type { MuscleGroup } from "@/lib/data/muscle-groups";
import { PARTS, type AnatomyView, type RnbhBodyPart } from "./paths";
import { highlightedParts, idlePath, partPath, spriteBaseId, spritePartId, spriteParts } from "./sprite";

const ALL_MUSCLES: MuscleGroup[] = [
  "neck", "chest", "front_delts", "biceps", "forearms", "abs", "obliques", "adductors", "quads", "calves_front",
  "traps", "rear_delts", "lats", "triceps", "lower_back", "glutes", "hamstrings", "calves_back",
];
const VIEWS: AnatomyView[] = ["front", "back"];
const pathCount = (part: RnbhBodyPart) =>
  (part.path.common ?? []).length + (part.path.left ?? []).length + (part.path.right ?? []).length;
const subpaths = (d: string) => (d.match(/M/g) ?? []).length;

describe("highlightedParts", () => {
  it("giver de trænede muskler, der kan ses i visningen, med hver sin styrke", () => {
    expect(
      highlightedParts("back", { primary: ["glutes"], secondary: ["hamstrings"], tertiary: ["calves_back", "quads"] }),
    ).toEqual([
      { slug: "gluteal", tier: "primary" },
      { slug: "hamstring", tier: "secondary" },
      { slug: "calves", tier: "tertiary" },
    ]);
  });

  it("lader den stærkeste styrke vinde, når en muskel står flere steder", () => {
    expect(highlightedParts("back", { primary: ["glutes"], secondary: ["glutes"], tertiary: ["glutes"] })).toEqual([
      { slug: "gluteal", tier: "primary" },
    ]);
  });

  it("læser skulderen som forreste eller bageste delta efter visningen", () => {
    const tiers = { primary: ["front_delts" as const], secondary: [], tertiary: [] };
    expect(highlightedParts("front", tiers)).toEqual([{ slug: "deltoids", tier: "primary" }]);
    expect(highlightedParts("back", tiers)).toEqual([]);
  });

  it("fremhæver aldrig led, hænder, fødder, hoved eller hår", () => {
    for (const view of VIEWS) {
      const slugs = highlightedParts(view, { primary: ALL_MUSCLES, secondary: [], tertiary: [] }).map((p) => p.slug);
      expect(slugs).toEqual(spriteParts(view).map((p) => p.slug));
      for (const still of ["ankles", "feet", "hair", "hands", "head", "knees"]) expect(slugs).not.toContain(still);
    }
  });
});

describe("spritens stier", () => {
  it("samler alle en muskels stier i én sti", () => {
    for (const view of VIEWS) {
      for (const part of PARTS.male[view]) expect(subpaths(partPath(part)), `${view}/${part.slug}`).toBe(pathCount(part));
    }
  });

  it("har hver sti i visningen med i den ikke-aktive figur, én gang", () => {
    for (const view of VIEWS) {
      const total = PARTS.male[view].reduce((sum, part) => sum + pathCount(part), 0);
      expect(subpaths(idlePath(view))).toBe(total);
    }
  });

  it("giver hver visning og hver muskel sit eget id", () => {
    const ids = VIEWS.flatMap((view) => [spriteBaseId(view), ...spriteParts(view).map((p) => spritePartId(view, p.slug))]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(spriteBaseId("back")).toBe("anatomy-back");
    expect(spritePartId("back", "lower-back")).toBe("anatomy-back-lower-back");
  });
});
