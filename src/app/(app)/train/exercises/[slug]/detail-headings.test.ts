/**
 * The exercise detail page is content-dense but had exactly one heading
 * (the exercise name), so a screen reader could not jump between its
 * sections. The labels keep the `.eyebrow` look — only the tag changes.
 *
 * The page itself is an async server component wired to Supabase, so this
 * asserts on its source. The hero's two labels are covered by a real render
 * in ExerciseHero.test.tsx.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "page.tsx"), "utf8");

describe("exercise detail section headings", () => {
  it("renders «Typiske fejl» as a heading", () => {
    expect(src).toContain('<h2 className="eyebrow">{t("detail.mistakes")}</h2>');
  });

  it("renders Setup / Progression / Regression as headings via InfoBlock", () => {
    for (const key of ["setup", "progression", "regression"]) {
      expect(src).toContain(`<InfoBlock eyebrow={t("detail.${key}")}`);
    }
    expect(src).toMatch(
      /function InfoBlock[\s\S]*?<h2 className="eyebrow">\{eyebrow\}<\/h2>/,
    );
  });

  it("leaves no section label as a bare styled div", () => {
    expect(src).not.toMatch(/<div className="eyebrow">\{(t\("detail\.|eyebrow)/);
  });

  it("keeps the breadcrumb row a div — it is metadata, not a section", () => {
    expect(src).toContain('<div className="eyebrow mb-3 flex');
  });
});
