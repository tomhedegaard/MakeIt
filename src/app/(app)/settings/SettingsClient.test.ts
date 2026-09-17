import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync(new URL("./SettingsClient.tsx", import.meta.url), "utf8");
const da = JSON.parse(readFileSync(new URL("../../../../messages/da/Settings.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../../../../messages/en/Settings.json", import.meta.url), "utf8"));

describe("Settings danger zone keeps its warning eyebrow (spec §6)", () => {
  it("the Danger zone SectionHeader carries an eyebrow", () => {
    expect(src).toMatch(/<SectionHeader eyebrow=\{t\("danger\.eyebrow"\)\} title=\{t\("danger\.title"\)\} \/>/);
  });

  it("the Account SectionHeader no longer carries its own eyebrow", () => {
    expect(src).not.toMatch(/t\("account\.eyebrow"\)/);
  });

  it("da/en carry a danger.eyebrow with the right copy, no dashes", () => {
    expect(da.danger.eyebrow).toBe("Farezone");
    expect(en.danger.eyebrow).toBe("Danger zone");
  });

  it("account.eyebrow is gone from both languages", () => {
    expect(da.account.eyebrow).toBeUndefined();
    expect(en.account.eyebrow).toBeUndefined();
  });
});
