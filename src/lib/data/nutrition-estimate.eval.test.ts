/**
 * Launch evaluation for the HQ meal estimate (spec 2026-09-27 A.2).
 *
 * 30 of our own meal photos with a WEIGHED kcal total. The estimate is
 * good enough to open to members when the weighed number falls inside
 * HQ's interval in at least 80 % of the meals. Every assumption is
 * printed so a human can also check for misidentified dishes.
 *
 * Skipped unless MEAL_EVAL_DIR points at a folder with the photos and a
 * manifest.json — it costs real API calls. Run on demand:
 *
 *   MEAL_EVAL_DIR=~/meal-eval ANTHROPIC_API_KEY=... \
 *     npx vitest run src/lib/data/nutrition-estimate.eval.test.ts
 *
 * manifest.json:
 *   [{ "file": "01.jpg", "kcal": 640, "dish": "Cobb salad",
 *      "text": "valgfri tekst", "answers": { "1": "Soyasauce" } }, …]
 *
 * See docs/nutrition-estimate-eval.md.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { estimateMeal, identifyMeal, type MealAnswer } from "./nutrition-estimate-claude";

const DIR = process.env.MEAL_EVAL_DIR?.replace(/^~/, process.env.HOME ?? "~");
const RUN = Boolean(DIR && process.env.ANTHROPIC_API_KEY);

type Case = { file: string; kcal: number; dish?: string; text?: string; answers?: Record<string, string> };

describe.skipIf(!RUN)("HQ meal estimate — launch evaluation", () => {
  it(
    "puts the weighed kcal inside HQ's interval in at least 80 % of 30 meals",
    async () => {
      const cases = JSON.parse(readFileSync(join(DIR!, "manifest.json"), "utf8")) as Case[];
      expect(cases.length).toBeGreaterThanOrEqual(30);

      const rows: string[] = [];
      let hits = 0;
      for (const c of cases) {
        const base64 = readFileSync(join(DIR!, c.file)).toString("base64");
        const input = { photo: { base64, mediaType: "image/jpeg" as const }, text: c.text ?? null };
        const id = await identifyMeal(input);
        // Answer from the manifest, else HQ's own first guess, like a quick member would.
        const answers: MealAnswer[] = (id?.questions ?? []).map((q) => ({
          prompt: q.prompt,
          answer: c.answers?.[q.id] ?? q.options[0] ?? "ved ikke",
        }));
        const est = await estimateMeal(input, answers);
        const hit = !!est && c.kcal >= est.kcalRange.low && c.kcal <= est.kcalRange.high;
        if (hit) hits++;
        rows.push(
          [
            c.file.padEnd(10),
            String(c.kcal).padStart(5),
            est ? `${est.totals.kcal}`.padStart(5) : "  -  ",
            est ? `${est.kcalRange.low}-${est.kcalRange.high}`.padEnd(11) : "".padEnd(11),
            hit ? "✓" : "✗",
            est?.confidence ?? "-",
            `${answers.length}q`,
            `${c.dish ?? ""} → ${est?.assumption ?? "intet estimat"}`,
          ].join("  "),
        );
      }
      const rate = hits / cases.length;
      console.log(["fil         vejet  HQ    interval    ok  sikkerhed  spørgsmål  ret", ...rows, `\nRamt: ${hits}/${cases.length} = ${(rate * 100).toFixed(0)} %`].join("\n"));
      expect(rate).toBeGreaterThanOrEqual(0.8);
    },
    30 * 60_000,
  );
});
