import { describe, expect, it } from "vitest";
import { MODULES, MODULE_KEYS, BUNDLE_GRANTS } from "./modules";

describe("modules catalog", () => {
  it("has one entry per module key, self-consistent", () => {
    for (const key of MODULE_KEYS) {
      expect(MODULES[key].key).toBe(key);
      expect(MODULES[key].priceEnv).toMatch(/^STRIPE_PRICE_/);
      expect(MODULES[key].trialDays).toBeGreaterThan(0);
    }
    expect(Object.keys(MODULES).sort()).toEqual([...MODULE_KEYS].sort());
  });

  it("maps each module to a distinct domain and route", () => {
    const domains = MODULE_KEYS.map((k) => MODULES[k].domain);
    const routes = MODULE_KEYS.map((k) => MODULES[k].route);
    expect(new Set(domains).size).toBe(MODULE_KEYS.length);
    expect(new Set(routes).size).toBe(MODULE_KEYS.length);
  });

  it("crew bundle grants every module", () => {
    expect([...BUNDLE_GRANTS.crew].sort()).toEqual([...MODULE_KEYS].sort());
  });
});
