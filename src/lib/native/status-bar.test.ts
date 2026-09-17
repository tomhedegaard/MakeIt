import { describe, expect, it, vi } from "vitest";
import { statusBarStyleFor, syncStatusBar } from "./status-bar";

describe("statusBarStyleFor", () => {
  it("uses dark text on light surfaces", () => expect(statusBarStyleFor("light")).toBe("LIGHT"));
  it("uses light text on dark surfaces", () => expect(statusBarStyleFor("dark")).toBe("DARK"));
  it("falls back to light text for unknown values (Nat is the :root default)", () =>
    expect(statusBarStyleFor("normal")).toBe("DARK"));
});

describe("syncStatusBar", () => {
  it("does nothing without the injected plugin", async () => {
    await expect(syncStatusBar(undefined, "light")).resolves.toBe(false);
  });

  it("sets style and matching background", async () => {
    const plugin = { setStyle: vi.fn().mockResolvedValue(undefined), setBackgroundColor: vi.fn().mockResolvedValue(undefined) };
    await syncStatusBar(plugin, "light");
    expect(plugin.setStyle).toHaveBeenCalledWith({ style: "LIGHT" });
    expect(plugin.setBackgroundColor).toHaveBeenCalledWith({ color: "#E7E9EB" });
  });

  it("swallows plugin errors (Android 15+ rejects background colour)", async () => {
    const plugin = { setStyle: vi.fn().mockResolvedValue(undefined), setBackgroundColor: vi.fn().mockRejectedValue(new Error("x")) };
    await expect(syncStatusBar(plugin, "dark")).resolves.toBe(true);
  });
});
