import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function loadJson(rel: string): Record<string, unknown> {
  return JSON.parse(read(rel)) as Record<string, unknown>;
}

function keysOf(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === "object" && v !== null && !Array.isArray(v)
      ? keysOf(v, path)
      : [path];
  });
}

const daAdaptive = loadJson("messages/da/Adaptive.json");
const enAdaptive = loadJson("messages/en/Adaptive.json");
const daMessages = loadJson("messages/da/Messages.json");
const enMessages = loadJson("messages/en/Messages.json");
const daCoaching = loadJson("messages/da/Coaching.json");
const enCoaching = loadJson("messages/en/Coaching.json");
const daMind = loadJson("messages/da/Mind.json");
const enMind = loadJson("messages/en/Mind.json");

const FORBIDDEN = [/claude/i, /sparkle/i, /anthropic/i];

function assertEditorial(value: string) {
  for (const re of FORBIDDEN) {
    expect(value).not.toMatch(re);
  }
}

describe("CDO identity — Munk (coach) vs Motor (engine)", () => {
  it("keeps Adaptive strip/dots identity keys in DA/EN lockstep", () => {
    const daStrip = daAdaptive.strip as Record<string, unknown>;
    const enStrip = enAdaptive.strip as Record<string, unknown>;
    expect(keysOf(daStrip)).toEqual(keysOf(enStrip));
    expect(daStrip.role).toBe("Motor");
    expect(enStrip.role).toBe("Motor");
    expect(daStrip.attribution).toBe("Motor · Adaptive Engine");
    expect(enStrip.attribution).toBe("Motor · Adaptive Engine");
    expect(daStrip.munkRole).toBe("Coach");
    expect(enStrip.munkRole).toBe("Coach");
    expect(daStrip.gloss).toBe(
      "Adaptive Engine tilpasser ugen — Munk er din coach",
    );
    expect(enStrip.gloss).toBe(
      "Adaptive Engine adapts the week — Munk is your coach",
    );

    const daDots = daAdaptive.dots as Record<string, unknown>;
    const enDots = enAdaptive.dots as Record<string, unknown>;
    expect(daDots.gloss).toBe(daStrip.gloss);
    expect(enDots.gloss).toBe(enStrip.gloss);
    assertEditorial(String(daStrip.gloss));
    assertEditorial(String(enStrip.gloss));
  });

  it("keeps chat stream chrome as Coach person vs Motor system", () => {
    const da = daMessages.streams as Record<string, string>;
    const en = enMessages.streams as Record<string, string>;
    expect(keysOf(da)).toEqual(keysOf(en));
    expect(da.munkRole).toBe("Coach");
    expect(en.munkRole).toBe("Coach");
    expect(da.munkSub).toBe("Mikael Munk · person");
    expect(en.munkSub).toBe("Mikael Munk · person");
    expect(da.motorRole).toBe("Motor");
    expect(en.motorRole).toBe("Motor");
    expect(da.motorTitle).toBe("Motor · Adaptive Engine");
    expect(en.motorTitle).toBe("Motor · Adaptive Engine");
    expect(da.motorSub).toBe("Adaptive Engine · system");
    expect(en.motorSub).toBe("Adaptive Engine · system");

    const daPage = daMessages.page as Record<string, string>;
    const enPage = enMessages.page as Record<string, string>;
    expect(daPage.subtitle).toMatch(/Munk er din coach/);
    expect(daPage.subtitle).toMatch(/systemet, ikke en person/);
    expect(enPage.subtitle).toMatch(/Munk is your coach/);
    expect(enPage.subtitle).toMatch(/the system, not a person/);
    assertEditorial(daPage.subtitle);
    assertEditorial(enPage.subtitle);
  });

  it("adds Coach vs Motor chips on Train without rewriting header.subtitle", () => {
    const da = daCoaching.header as Record<string, string>;
    const en = enCoaching.header as Record<string, string>;
    expect(da.coachChip).toBe("Coach · Mikael Munk");
    expect(en.coachChip).toBe("Coach · Mikael Munk");
    expect(da.motorChip).toBe("Motor · Adaptive Engine");
    expect(en.motorChip).toBe("Motor · Adaptive Engine");
    expect(da.subtitle).toBe(
      "Motoren planlægger vægtene. Munk skriver under når det kræver et menneske.",
    );
    expect(en.subtitle).toBe(
      "The Motor plans the weights. Munk signs off when it needs a human.",
    );

    const daLib = daCoaching.library as Record<string, string>;
    const enLib = enCoaching.library as Record<string, string>;
    expect(daLib.engine).toBe("Motor");
    expect(enLib.engine).toBe("Motor");
    expect(daLib.engineName).toBe("Adaptive Engine");
    expect(enLib.engineName).toBe("Adaptive Engine");
  });

  it("labels the Mind reflection as Motor, not a coach persona", () => {
    const da = daMind.reflection as Record<string, string>;
    const en = enMind.reflection as Record<string, string>;
    expect(keysOf(da)).toEqual(keysOf(en));
    expect(da.eyebrow).toBe("Motor");
    expect(en.eyebrow).toBe("Motor");
    expect(da.title).toBe("Motor · Adaptive Engine");
    expect(en.title).toBe("Motor · Adaptive Engine");
    expect(da.gloss).toMatch(/Munk er din coach/);
    expect(en.gloss).toMatch(/Munk is your coach/);
    expect(da.gloss.toLowerCase()).not.toContain("mind-coach");
    expect(en.gloss.toLowerCase()).not.toContain("mind-coach");
    assertEditorial(da.gloss);
    assertEditorial(en.gloss);
  });

  it("wires identity chrome from messages, not hardcoded leftovers", () => {
    const strip = read("src/components/adaptive/AdaptiveReasonStrip.tsx");
    expect(strip).toContain("copy.role");
    expect(strip).toContain("copy.gloss");
    expect(strip).toContain("copy.munkRole");
    expect(strip).toContain("data-engine-gloss");
    expect(strip).not.toMatch(/Mind-coach/);

    const dots = read("src/components/dashboard/ConnectDotsStream.tsx");
    expect(dots).toContain("copy.gloss");
    expect(dots).toContain("data-engine-gloss");

    const streams = read("src/components/chat/DualStreamMessages.tsx");
    expect(streams).toContain("copy.munkRole");
    expect(streams).toContain("copy.motorRole");
    expect(streams).toContain('data-identity="coach"');
    expect(streams).toContain('data-identity="motor"');

    const coaching = read("src/app/(app)/coaching/page.tsx");
    expect(coaching).toContain("header.coachChip");
    expect(coaching).toContain("header.motorChip");
    expect(coaching).toContain("library.engine");
    expect(coaching).toContain("library.engineName");

    const reflection = read("src/components/mind/CoachReflection.tsx");
    expect(reflection).toContain('getTranslations("Mind.reflection")');
    expect(reflection).toContain('t("gloss")');
    expect(reflection).not.toMatch(/Mind-coach · i dag/);

    const loaders = [
      read("src/lib/ui/sprint-a-copy.ts"),
      read("src/lib/ui/sprint-b-copy.ts"),
    ].join("\n");
    expect(loaders).toContain('t("role")');
    expect(loaders).toContain('t("gloss")');
    expect(loaders).toContain('t("munkRole")');
    expect(loaders).toContain('t("motorRole")');
  });
});
