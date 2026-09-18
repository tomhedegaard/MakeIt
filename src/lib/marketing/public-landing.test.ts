import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEMBER_LOGIN_HREF, PUBLIC_ACCESS_HREF } from "./public-cta";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

const da = JSON.parse(
  readFileSync(new URL("../../../messages/da/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const en = JSON.parse(
  readFileSync(new URL("../../../messages/en/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

const kalkDir = new URL("../../components/marketing/kalk/", import.meta.url);
const kalkSources = readdirSync(kalkDir)
  .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
  .map((f) => [f, readFileSync(new URL(f, kalkDir), "utf8")] as const);

function walkStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(walkStrings);
}

/** Every Marketing group the live landing renders (Kalk + reused FAQ). */
const liveCopy = [da.kalk, da.faq, en.kalk, en.faq].flatMap(walkStrings).join("\n");

describe("public landing honesty", () => {
  it("sends new visitors to the existing waitlist, not a blind login", () => {
    expect(PUBLIC_ACCESS_HREF).toBe("/#waitlist");
    expect(MEMBER_LOGIN_HREF).toBe("/login");
  });

  it("does not invent a price or claim a market fraction in the public beta state", () => {
    expect(liveCopy).not.toMatch(/brøkdel|markedssnit|fraction of the market/i);
    expect(liveCopy).not.toMatch(/\[XX\]|\[YY\]|\[ZZ\]/);
    expect(liveCopy).not.toMatch(/kr\.?\s?\d|DKK|€\s?\d|\$\d/i);
  });

  it("keeps invite scarcity on the access CTA, no free trial", () => {
    const daKalk = da.kalk as { access: Record<string, string> };
    const enKalk = en.kalk as { access: Record<string, string> };
    expect(daKalk.access.sub).toMatch(/invite/i);
    expect(enKalk.access.sub).toMatch(/invite/i);
    expect(liveCopy).not.toMatch(/gratis|prøveperiode|free trial/i);
  });

  it("keeps vendor names out of public marketing copy", () => {
    const blob = [...walkStrings(da), ...walkStrings(en)].join("\n");
    expect(blob).not.toMatch(/Claude/i);
  });

  it("renders landing copy without waiting for JS to reveal it", () => {
    for (const [file, src] of kalkSources) {
      expect(src, file).not.toMatch(/data-reveal|reveal-pending/);
      expect(src, file).not.toMatch(/initial=\{\{\s*opacity:\s*0/);
    }
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
  });

  it("points login visitors without a code to the waitlist", () => {
    const daLogin = JSON.parse(
      readFileSync(new URL("../../../messages/da/Login.json", import.meta.url), "utf8"),
    ) as { waitlistHint: string; waitlistLink: string };
    const enLogin = JSON.parse(
      readFileSync(new URL("../../../messages/en/Login.json", import.meta.url), "utf8"),
    ) as { waitlistHint: string; waitlistLink: string };
    expect(daLogin.waitlistHint).toMatch(/invite/i);
    expect(enLogin.waitlistHint).toMatch(/invite/i);
    expect(daLogin.waitlistLink).toMatch(/ventelisten/i);
    expect(enLogin.waitlistLink).toMatch(/waitlist/i);
  });

  it("states form-check as AI draft signed by a human, not a named vendor", () => {
    const daMunk = (da.kalk as { munk: { card: { draftLabel: string }; flow: { label: string }[] } }).munk;
    const enMunk = (en.kalk as { munk: { card: { draftLabel: string }; flow: { label: string }[] } }).munk;
    expect(daMunk.card.draftLabel).toMatch(/AI-udkast/i);
    expect(enMunk.card.draftLabel).toMatch(/AI draft/i);
    expect(daMunk.flow.map((s) => s.label).join(" ")).toMatch(/Munk retter og skriver under/);
    expect(enMunk.flow.map((s) => s.label).join(" ")).toMatch(/Munk corrects and signs off/);
    expect(walkStrings(daMunk).join(" ")).not.toMatch(/Claude/i);
    expect(walkStrings(enMunk).join(" ")).not.toMatch(/Claude/i);
  });
});
