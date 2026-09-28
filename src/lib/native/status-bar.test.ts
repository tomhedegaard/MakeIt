import { describe, expect, it, vi } from "vitest";
import { schemeFromDocument, statusBarStyleFor, syncStatusBar } from "./status-bar";

describe("statusBarStyleFor", () => {
  it("uses dark text on light surfaces", () => expect(statusBarStyleFor("light")).toBe("LIGHT"));
  it("uses light text on dark surfaces", () => expect(statusBarStyleFor("dark")).toBe("DARK"));
  it("falls back to light text for unknown values", () =>
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
    expect(plugin.setBackgroundColor).toHaveBeenCalledWith({ color: "#FFFFFF" });
  });

  it("swallows plugin errors (Android 15+ rejects background colour)", async () => {
    const plugin = { setStyle: vi.fn().mockResolvedValue(undefined), setBackgroundColor: vi.fn().mockRejectedValue(new Error("x")) };
    await expect(syncStatusBar(plugin, "dark")).resolves.toBe(true);
  });
});

describe("schemeFromDocument", () => {
  const fakeDoc = (found: string[]) => ({
    querySelector: (sel: string) => (found.includes(sel) ? {} : null),
  });

  it("is dark when the Nat theme root is present (:has() may be unsupported)", () => {
    const doc = fakeDoc(['.theme-root[data-theme="nat"]']);
    expect(schemeFromDocument(doc)).toBe("dark");
  });

  it("is light when the Nord theme root is present", () => {
    const doc = fakeDoc(['.theme-root[data-theme="nord"]']);
    expect(schemeFromDocument(doc)).toBe("light");
  });

  it("Nat wins when both theme roots are somehow present, matching CSS precedence", () => {
    const doc = fakeDoc(['.theme-root[data-theme="nat"]', '.theme-root[data-theme="nord"]']);
    expect(schemeFromDocument(doc)).toBe("dark");
  });

  it("falls back to light when no theme root is found (Nord lys sits on :root)", () => {
    const doc = fakeDoc([]);
    expect(schemeFromDocument(doc)).toBe("light");
  });
});
