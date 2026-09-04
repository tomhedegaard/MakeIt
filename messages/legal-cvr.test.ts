import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMPANY } from "../src/lib/company";

const da = JSON.parse(
  readFileSync(new URL("./da/Legal.json", import.meta.url), "utf8"),
) as {
  privacy: { introCvrFallback: string };
  terms: { s01: { cvrFallback: string } };
};
const en = JSON.parse(
  readFileSync(new URL("./en/Legal.json", import.meta.url), "utf8"),
) as {
  privacy: { introCvrFallback: string };
  terms: { s01: { cvrFallback: string } };
};

describe("legal CVR fallback copy", () => {
  it("does not invent a CVR number while the entity is unregistered", () => {
    expect(COMPANY.legal.cvr).toBeNull();
  });

  it("uses finished Danish fallbacks instead of a blank «CVR — kontakt» field", () => {
    expect(da.privacy.introCvrFallback).not.toMatch(/CVR\s*—\s*kontakt/i);
    expect(da.terms.s01.cvrFallback).not.toMatch(/CVR\s*—\s*kontakt/i);
    expect(da.privacy.introCvrFallback).toMatch(/ikke.*offentliggjort/i);
    expect(da.privacy.introCvrFallback).toMatch(/under registrering/i);
    expect(da.terms.s01.cvrFallback).toMatch(/ikke.*offentliggjort/i);
  });

  it("keeps English fallbacks in the same honest register", () => {
    expect(en.privacy.introCvrFallback).not.toMatch(/CVR\s*—\s*contact/i);
    expect(en.terms.s01.cvrFallback).not.toMatch(/CVR\s*—\s*contact/i);
    expect(en.privacy.introCvrFallback).toMatch(/not yet published/i);
    expect(en.privacy.introCvrFallback).toMatch(/being registered/i);
    expect(en.terms.s01.cvrFallback).toMatch(/not yet published/i);
  });
});
