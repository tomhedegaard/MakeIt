import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import daMind from "../../../messages/da/Mind.json";
import enMind from "../../../messages/en/Mind.json";

const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
const LINE = read("./MindSafetyLine.tsx");
const LAYOUT = read("../../app/(app)/mind/layout.tsx");
const DISCLAIMER = read("./MindDisclaimer.tsx");

describe("Mind safety line (spec §6.5)", () => {
  it("sits at the foot of every Mind page via the layout", () => {
    expect(LAYOUT).toMatch(/\{children\}\s*<MindSafetyLine \/>/);
  });

  it("makes both crisis numbers tappable", () => {
    expect(LINE).toContain('href="tel:70201201"');
    expect(LINE).toContain('href="tel:112"');
    expect(DISCLAIMER).toContain('href="tel:70201201"');
    expect(DISCLAIMER).toContain('href="tel:112"');
  });

  it("uses the brief's wording in both languages", () => {
    expect(daMind.safetyLine.notTreatment).toBe("Appen er ikke behandling.");
    expect(daMind.safetyLine.livslinien).toBe("Livslinien 70 201 201");
    expect(daMind.safetyLine.emergency).toBe("akut 112");
    expect(enMind.safetyLine.livslinien).toContain("70 201 201");
  });
});
