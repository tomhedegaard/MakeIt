/**
 * 18-årsgrænsen on every path that can create an account (terms, "Alder").
 * Source-level contract, like the other login action tests.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const SRC = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const CALLBACK = readFileSync(new URL("../auth/callback/route.ts", import.meta.url), "utf8");
const section = (from: string, to: string) => SRC.slice(SRC.indexOf(from), SRC.indexOf(to));

describe("18-year confirmation on signup", () => {
  it("magic link: required and recorded only when the email is new", () => {
    const magic = section("export async function magicLinkAction", "export async function passwordAction");
    expect(magic).toMatch(/send\.action === "send-signup"\) \{\s*\/\/[^\n]*\n\s*if \(!confirmsAdult\(formData\)\) redirect\("\/login\?err=age"\);/);
    expect(magic).toContain("...(createUser ? { data: adultMetadata() } : {})");
  });

  it("password signup: required before the invite, recorded in the user metadata", () => {
    const pw = section("export async function passwordAction", "export async function oauthAction");
    expect(pw.indexOf('redirect("/login?err=age")')).toBeLessThan(pw.indexOf("requireValidConnectedInvite(code)"));
    expect(pw).toContain("data: { invite: code, ...adultMetadata() }");
  });

  it("OAuth: required, carried across the round-trip and recorded once in the callback", () => {
    const oauth = section("export async function oauthAction", "export async function authMode");
    expect(oauth).toContain('if (!confirmsAdult(formData)) redirect("/login?err=age")');
    expect(oauth).toContain("PENDING_ADULT_COOKIE");
    expect(CALLBACK).toContain("hasAdultConfirmation(user.user_metadata)");
    expect(CALLBACK).toContain("cookieStore.delete(PENDING_ADULT_COOKIE)");
  });
});
