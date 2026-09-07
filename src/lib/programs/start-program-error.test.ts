import { describe, expect, it } from "vitest";
import {
  isNextRedirectError,
  nextRedirectPath,
  startProgramDetail,
} from "./start-program-error";

describe("startProgramDetail", () => {
  it("prefers Error.message", () => {
    expect(startProgramDetail(new Error("relation does not exist"))).toBe(
      "relation does not exist",
    );
  });

  it("keeps non-empty strings", () => {
    expect(startProgramDetail("Program ikke fundet")).toBe(
      "Program ikke fundet",
    );
  });

  it("stringifies other values", () => {
    expect(startProgramDetail(42)).toBe("42");
  });
});

describe("isNextRedirectError", () => {
  it("recognizes the Next.js redirect sentinel", () => {
    expect(
      isNextRedirectError({ digest: "NEXT_REDIRECT;replace;/auth/login;307;" }),
    ).toBe(true);
  });

  it("rejects ordinary errors", () => {
    expect(isNextRedirectError(new Error("nope"))).toBe(false);
    expect(isNextRedirectError(null)).toBe(false);
  });
});

describe("nextRedirectPath", () => {
  it("reads the path from the Next.js redirect digest", () => {
    expect(
      nextRedirectPath({
        digest: "NEXT_REDIRECT;replace;/dashboard;307;",
      }),
    ).toBe("/dashboard");
    expect(
      nextRedirectPath({
        digest: "NEXT_REDIRECT;replace;/onboarding?err=gen;303;",
      }),
    ).toBe("/onboarding?err=gen");
  });

  it("returns null for non-redirects and unparseable digests", () => {
    expect(nextRedirectPath(new Error("nope"))).toBeNull();
    expect(nextRedirectPath({ digest: "NEXT_REDIRECT;replace;" })).toBeNull();
    expect(
      nextRedirectPath({ digest: "NEXT_REDIRECT;replace;dashboard;307;" }),
    ).toBeNull();
  });
});
