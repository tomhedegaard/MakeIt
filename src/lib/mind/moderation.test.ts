import { describe, expect, it } from "vitest";
import {
  claudeNullReasonFragment,
  combineModerationVerdicts,
} from "./moderation";

describe("combineModerationVerdicts", () => {
  it("keyword hit wins as crisis even when Claude is null", () => {
    expect(combineModerationVerdicts(true, null)).toBe("crisis");
  });

  it("keyword hit wins as crisis even when Claude says clean", () => {
    expect(
      combineModerationVerdicts(true, { status: "clean", categories: [] }),
    ).toBe("crisis");
  });

  it("keyword hit wins as crisis even when Claude says flagged", () => {
    expect(
      combineModerationVerdicts(true, { status: "flagged", categories: ["severe"] }),
    ).toBe("crisis");
  });

  it("Claude-null without keyword is flagged — never clean", () => {
    expect(combineModerationVerdicts(false, null)).toBe("flagged");
    expect(combineModerationVerdicts(false, null)).not.toBe("clean");
  });

  it("Claude crisis without keyword is crisis", () => {
    expect(
      combineModerationVerdicts(false, {
        status: "crisis",
        categories: ["suicidal"],
      }),
    ).toBe("crisis");
  });

  it("Claude flagged without keyword is flagged", () => {
    expect(
      combineModerationVerdicts(false, {
        status: "flagged",
        categories: ["severe"],
      }),
    ).toBe("flagged");
  });

  it("Claude clean without keyword is clean", () => {
    expect(
      combineModerationVerdicts(false, { status: "clean", categories: [] }),
    ).toBe("clean");
  });
});

describe("claudeNullReasonFragment", () => {
  it("returns a stable countable token", () => {
    expect(claudeNullReasonFragment()).toBe("claude:null");
  });
});
