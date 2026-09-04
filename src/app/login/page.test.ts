import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const login = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const da = JSON.parse(
  readFileSync(new URL("../../../messages/da/Login.json", import.meta.url), "utf8"),
) as { statusConnected: string };
const en = JSON.parse(
  readFileSync(new URL("../../../messages/en/Login.json", import.meta.url), "utf8"),
) as { statusConnected: string };

describe("login public status", () => {
  it("does not append env-derived Supabase project refs", () => {
    expect(login).not.toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
    expect(login).not.toMatch(/split\("\."\)\[0\]/);
  });

  it("keeps status copy as a short connected/demo label", () => {
    expect(da.statusConnected).toBe("Forbundet");
    expect(en.statusConnected).toBe("Connected");
    expect(da.statusConnected).not.toMatch(/·\s*$/);
    expect(en.statusConnected).not.toMatch(/·\s*$/);
  });
});
