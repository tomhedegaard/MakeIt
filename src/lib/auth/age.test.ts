import { describe, expect, it } from "vitest";
import { ADULT_FIELD, adultMetadata, confirmsAdult, hasAdultConfirmation } from "./age";

const form = (entries: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
};

describe("18-årsgrænsen", () => {
  it("only counts a ticked box as a confirmation", () => {
    expect(confirmsAdult(form({ [ADULT_FIELD]: "on" }))).toBe(true);
    expect(confirmsAdult(form({}))).toBe(false);
    expect(confirmsAdult(form({ [ADULT_FIELD]: "yes" }))).toBe(false);
  });

  it("records when the confirmation was given", () => {
    expect(adultMetadata(new Date("2026-09-27T10:00:00Z"))).toEqual({ adult_confirmed_at: "2026-09-27T10:00:00.000Z" });
  });

  it("recognises an existing confirmation in user metadata", () => {
    expect(hasAdultConfirmation({ adult_confirmed_at: "2026-09-27T10:00:00.000Z" })).toBe(true);
    expect(hasAdultConfirmation({})).toBe(false);
    expect(hasAdultConfirmation(null)).toBe(false);
  });
});
