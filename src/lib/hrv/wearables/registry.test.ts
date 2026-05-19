import { describe, it, expect } from "vitest";
import { getProvider } from "./registry";

describe("getProvider", () => {
  it("returns the WHOOP provider for id \"whoop\"", () => {
    const provider = getProvider("whoop");
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe("whoop");
  });

  it("returns the Oura provider for id \"oura\"", () => {
    const provider = getProvider("oura");
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe("oura");
  });

  it("returns the Polar provider for id \"polar\"", () => {
    const provider = getProvider("polar");
    expect(provider).not.toBeNull();
    expect(provider?.id).toBe("polar");
  });

  it("returns null for an unknown provider id", () => {
    expect(getProvider("nonsense")).toBeNull();
  });
});
