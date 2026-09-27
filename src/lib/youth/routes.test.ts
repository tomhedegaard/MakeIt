import { describe, expect, it } from "vitest";
import { youthClaims, youthMayOpen } from "./routes";

const noMind = { youth: true, mind: false };
const withMind = { youth: true, mind: true };

describe("youthClaims", () => {
  it("reads only the server-written app_metadata", () => {
    expect(youthClaims({ account_type: "youth", consent_mind: true })).toEqual({ youth: true, mind: true });
    expect(youthClaims({ account_type: "adult" })).toEqual({ youth: false, mind: false });
    expect(youthClaims(null)).toEqual({ youth: false, mind: false });
    expect(youthClaims({ account_type: "youth", consent_mind: "yes" })).toEqual({ youth: true, mind: false });
  });
});

describe("youthMayOpen", () => {
  it.each(["/dashboard", "/coaching", "/program/UNG-01", "/session/abc", "/train/exercises/push-up", "/profile", "/settings", "/ung/mad"])(
    "opens %s",
    (p) => expect(youthMayOpen(p, noMind)).toBe(true),
  );

  it.each(["/nutrition", "/nutrition/shopping", "/hrv", "/community", "/buddy", "/messages", "/form-check", "/coach-school", "/reps", "/billing", "/science", "/ung", "/coach"])(
    "keeps %s closed",
    (p) => expect(youthMayOpen(p, withMind)).toBe(false),
  );

  it("opens Mind only with consent from both guardian and young member", () => {
    expect(youthMayOpen("/mind", noMind)).toBe(false);
    expect(youthMayOpen("/mind/check", withMind)).toBe(true);
  });

  it("does not match by string prefix alone", () => {
    expect(youthMayOpen("/dashboardx", noMind)).toBe(false);
    expect(youthMayOpen("/ung/madx", noMind)).toBe(false);
  });
});
