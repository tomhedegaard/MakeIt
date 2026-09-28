import { afterEach, describe, expect, it } from "vitest";
import { assertCronAuth, cronSecretIsConfigured, isCronAuthorized } from "./auth";

const SECRET = "test-cron-secret";

function req(authorization?: string): Request {
  return new Request("https://makeit.example/api/cron/x", {
    headers: authorization ? { authorization } : {},
  });
}

describe("cronSecretIsConfigured", () => {
  it("rejects missing and empty secrets", () => {
    expect(cronSecretIsConfigured(undefined)).toBe(false);
    expect(cronSecretIsConfigured(null)).toBe(false);
    expect(cronSecretIsConfigured("")).toBe(false);
  });

  it("admits a non-empty secret", () => {
    expect(cronSecretIsConfigured(SECRET)).toBe(true);
  });
});

describe("isCronAuthorized", () => {
  it("rejects when the secret is missing — including Bearer undefined", () => {
    expect(isCronAuthorized("Bearer undefined", undefined)).toBe(false);
    expect(isCronAuthorized(null, undefined)).toBe(false);
  });

  it("rejects when the secret is empty", () => {
    expect(isCronAuthorized("Bearer ", "")).toBe(false);
    expect(isCronAuthorized(`Bearer ${SECRET}`, "")).toBe(false);
  });

  it("rejects a wrong bearer when the secret is set", () => {
    expect(isCronAuthorized("Bearer other-secret", SECRET)).toBe(false);
    expect(isCronAuthorized("Bearer", SECRET)).toBe(false);
    expect(isCronAuthorized(null, SECRET)).toBe(false);
  });

  it("admits the exact Bearer token", () => {
    expect(isCronAuthorized(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });
});

describe("assertCronAuth", () => {
  const previous = process.env.CRON_SECRET;

  afterEach(() => {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  });

  it("returns 401 JSON when CRON_SECRET is missing", async () => {
    delete process.env.CRON_SECRET;
    const denied = assertCronAuth(req("Bearer undefined"));
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
    expect(await denied!.json()).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 JSON when CRON_SECRET is empty", async () => {
    process.env.CRON_SECRET = "";
    const denied = assertCronAuth(req("Bearer "));
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
  });

  it("returns 401 JSON for a wrong bearer", async () => {
    process.env.CRON_SECRET = SECRET;
    const denied = assertCronAuth(req("Bearer wrong"));
    expect(denied).not.toBeNull();
    expect(denied!.status).toBe(401);
  });

  it("returns null for the correct bearer", () => {
    process.env.CRON_SECRET = SECRET;
    expect(assertCronAuth(req(`Bearer ${SECRET}`))).toBeNull();
  });
});
