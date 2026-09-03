import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MEMBER_LOGIN_HREF, PUBLIC_ACCESS_HREF } from "./public-cta";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

const da = JSON.parse(
  readFileSync(new URL("../../../messages/da/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const en = JSON.parse(
  readFileSync(new URL("../../../messages/en/Marketing.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

function walkStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(walkStrings);
}

describe("public landing honesty", () => {
  it("sends new visitors to the existing waitlist, not a blind login", () => {
    expect(PUBLIC_ACCESS_HREF).toBe("/#waitlist");
    expect(MEMBER_LOGIN_HREF).toBe("/login");
  });

  it("keeps da/en value keys in lockstep after the beta rewrite", () => {
    const daValue = da.value as Record<string, unknown>;
    const enValue = en.value as Record<string, unknown>;
    expect(Object.keys(daValue).sort()).toEqual(Object.keys(enValue).sort());
    expect(daValue.betaNext).toEqual(expect.any(String));
    expect(daValue.betaCta).toEqual(expect.any(String));
    expect(daValue.marketFraction).toBeUndefined();
    expect(enValue.marketFraction).toBeUndefined();
  });

  it("does not invent a price or claim a market fraction in the public beta state", () => {
    const daValue = da.value as {
      positioningSub: string;
      betaNext: string;
      betaCta: string;
      priceLockNote: string;
    };
    const enValue = en.value as {
      positioningSub: string;
      betaNext: string;
      betaCta: string;
      priceLockNote: string;
    };
    const blob = [
      daValue.positioningSub,
      daValue.betaNext,
      daValue.betaCta,
      daValue.priceLockNote,
      enValue.positioningSub,
      enValue.betaNext,
      enValue.betaCta,
      enValue.priceLockNote,
    ].join("\n");
    expect(blob).not.toMatch(/brøkdel|markedssnit|fraction of the market/i);
    expect(blob).not.toMatch(/\[XX\]|\[YY\]|\[ZZ\]/);
    expect(daValue.betaNext).toMatch(/ventelisten|køen/i);
    expect(enValue.betaNext).toMatch(/waitlist/i);
  });

  it("keeps vendor names out of public marketing copy", () => {
    const blob = [...walkStrings(da), ...walkStrings(en)].join("\n");
    expect(blob).not.toMatch(/Claude/i);
  });

  it("keeps reveal content readable unless JS marks a node pending", () => {
    expect(css).toMatch(/\[data-reveal\] \{[\s\S]*?opacity: 1;/);
    expect(css).toMatch(/\[data-reveal\]\.reveal-pending:not\(\.is-visible\)/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.marketing-nav-sheet \{[\s\S]*?background:\s*var\(--bg\)/);
    expect(css).toMatch(/\.marketing-sticky-card \{[\s\S]*?top:\s*calc\(var\(--header-h\) \+ 1\.75rem\)/);
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

  it("states form-check as AI draft, not a named vendor or lone human coach", () => {
    const daApp = da.app as { phone: { formCheckDetail: string } };
    const enApp = en.app as { phone: { formCheckDetail: string } };
    expect(daApp.phone.formCheckDetail).toMatch(/AI-draft/i);
    expect(enApp.phone.formCheckDetail).toMatch(/AI draft/i);
    expect(daApp.phone.formCheckDetail).not.toMatch(/Claude/i);
    expect(enApp.phone.formCheckDetail).not.toMatch(/Claude/i);
  });
});
