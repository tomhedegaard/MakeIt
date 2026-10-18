import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MuscleGroup } from "@/lib/data/muscle-groups";
import AnatomySprite from "./AnatomySprite";
import AnatomyThumb from "./AnatomyThumb";

const ALL_MUSCLES: MuscleGroup[] = [
  "neck", "chest", "front_delts", "biceps", "forearms", "abs", "obliques", "adductors", "quads", "calves_front",
  "traps", "rear_delts", "lats", "triceps", "lower_back", "glutes", "hamstrings", "calves_back",
];
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const hrefs = (html: string) => [...html.matchAll(/<use href="#([^"]+)"/g)].map((m) => m[1]);
const ids = (html: string) => [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);

describe("AnatomyThumb", () => {
  it("tegner ingen stier selv: ét <use> til silhuetten og ét pr. trænet muskel", () => {
    const html = renderToStaticMarkup(
      <AnatomyThumb view="back" label="Anatomi-figur bagfra (mand)" primary={["glutes"]} secondary={["hamstrings"]} tertiary={["calves_back"]} />,
    );
    expect(html).not.toContain("<path");
    expect(hrefs(html)).toEqual(["anatomy-back", "anatomy-back-gluteal", "anatomy-back-hamstring", "anatomy-back-calves"]);
    expect(html).toContain('<use href="#anatomy-back-gluteal" style="fill:var(--muscle-primary)"');
    expect(html).toContain('<use href="#anatomy-back-hamstring" style="fill:var(--muscle-secondary)"');
    expect(html).toContain('<use href="#anatomy-back-calves" style="fill:var(--muscle-tertiary)"');
  });

  it("er et billede med navn og figurens eget udsnit", () => {
    const html = renderToStaticMarkup(<AnatomyThumb view="back" label="Anatomi-figur bagfra (mand)" />);
    expect(html).toMatch(/^<svg viewBox="724 0 724 1448" role="img" aria-label="Anatomi-figur bagfra \(mand\)"/);
  });
});

describe("AnatomySprite", () => {
  const sprite = renderToStaticMarkup(<AnatomySprite />);

  it("har et mål for hver henvisning, en figur kan lave", () => {
    const defined = new Set(ids(sprite));
    for (const view of ["front", "back"] as const) {
      const thumb = renderToStaticMarkup(<AnatomyThumb view={view} label="" primary={ALL_MUSCLES} />);
      expect(hrefs(thumb).length).toBeGreaterThan(10);
      for (const href of hrefs(thumb)) expect(defined, href).toContain(href);
    }
  });

  it("har ingen dubletter blandt sine id'er og er skjult for skærmlæsere", () => {
    expect(new Set(ids(sprite)).size).toBe(ids(sprite).length);
    expect(sprite).toMatch(/^<svg[^>]*aria-hidden="true"/);
  });
});

describe("bibliotekskortets vægt (/train/exercises)", () => {
  const card = read("../exercise/ExerciseCard.tsx");
  const page = read("../../app/(app)/train/exercises/page.tsx");

  it("holder den indlejrede figur ude af kortet og definerer silhuetten én gang på siden", () => {
    expect(card).toContain("<AnatomyThumb");
    expect(card).not.toMatch(/AnatomyFigure\b/);
    expect(page.match(/<AnatomySprite \/>/g) ?? []).toHaveLength(1);
  });
});
