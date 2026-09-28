import { describe, expect, it } from "vitest";
import {
  canAuthenticatedReadMentalSession,
  isPersonalSessionSlug,
  parsePersonalSessionSlug,
  personalSessionSlug,
} from "./session-privacy";

const OWNER = "550e8400-e29b-41d4-a716-446655440000";
const OTHER = "11111111-2222-3333-4444-555555555555";
const DATE = "2026-08-30";

describe("personalSessionSlug", () => {
  it("builds personal-<memberId>-<date>", () => {
    expect(personalSessionSlug(OWNER, DATE)).toBe(
      `personal-${OWNER}-${DATE}`,
    );
  });
});

describe("isPersonalSessionSlug", () => {
  it("is true only for the personal- prefix", () => {
    expect(isPersonalSessionSlug(`personal-${OWNER}-${DATE}`)).toBe(true);
    expect(isPersonalSessionSlug("personal-malformed")).toBe(true);
    expect(isPersonalSessionSlug("box-breath-4-4-4-4-da")).toBe(false);
    expect(isPersonalSessionSlug("coherence-5-5-da")).toBe(false);
  });
});

describe("parsePersonalSessionSlug", () => {
  it("extracts a UUID member id when the date is the trailing YYYY-MM-DD", () => {
    expect(parsePersonalSessionSlug(`personal-${OWNER}-${DATE}`)).toEqual({
      memberId: OWNER,
      forDate: DATE,
    });
  });

  it("extracts a non-UUID demo member id", () => {
    expect(parsePersonalSessionSlug("personal-mock-munk-2026-08-30")).toEqual({
      memberId: "mock-munk",
      forDate: "2026-08-30",
    });
  });

  it("returns null for library slugs and malformed personal slugs", () => {
    expect(parsePersonalSessionSlug("box-breath-4-4-4-4-da")).toBeNull();
    expect(parsePersonalSessionSlug("personal-no-date")).toBeNull();
    expect(parsePersonalSessionSlug("personal-")).toBeNull();
  });
});

describe("canAuthenticatedReadMentalSession", () => {
  it("lets any authenticated viewer read library slugs", () => {
    expect(
      canAuthenticatedReadMentalSession({
        slug: "box-breath-4-4-4-4-da",
        viewerId: OTHER,
      }),
    ).toBe(true);
    expect(
      canAuthenticatedReadMentalSession({
        slug: "coherence-5-5-da",
        viewerId: OWNER,
      }),
    ).toBe(true);
  });

  it("lets only the owner read a well-formed personal slug", () => {
    const slug = personalSessionSlug(OWNER, DATE);
    expect(
      canAuthenticatedReadMentalSession({ slug, viewerId: OWNER }),
    ).toBe(true);
    expect(
      canAuthenticatedReadMentalSession({ slug, viewerId: OTHER }),
    ).toBe(false);
  });

  it("denies malformed personal-* slugs (fail-closed, matches neither SQL policy)", () => {
    expect(
      canAuthenticatedReadMentalSession({
        slug: "personal-no-date",
        viewerId: OWNER,
      }),
    ).toBe(false);
  });
});
