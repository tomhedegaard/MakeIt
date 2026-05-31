import { describe, it, expect } from "vitest";
import { encryptToken, decryptToken } from "./crypto";

const KEY = "0".repeat(64); // 32 bytes hex — test key

describe("token crypto", () => {
  it("round-trips a token", () => {
    const ct = encryptToken("secret-access-token", KEY);
    expect(ct).not.toContain("secret-access-token");
    expect(decryptToken(ct, KEY)).toBe("secret-access-token");
  });
  it("produces different ciphertext each call (random IV)", () => {
    expect(encryptToken("x", KEY)).not.toBe(encryptToken("x", KEY));
  });
  it("throws on tampered ciphertext", () => {
    const ct = encryptToken("x", KEY);
    const tampered = ct.slice(0, -4) + "AAAA";
    expect(() => decryptToken(tampered, KEY)).toThrow();
  });
});
