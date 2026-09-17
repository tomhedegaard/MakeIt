// src/components/app/navigation.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const bar = readFileSync(new URL("./MobileTabBar.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("./AppShell.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");
const da = JSON.parse(readFileSync(new URL("../../../messages/da/Nav.json", import.meta.url), "utf8"));
const en = JSON.parse(readFileSync(new URL("../../../messages/en/Nav.json", import.meta.url), "utf8"));

describe("Kalk navigation (spec §6)", () => {
  it("has exactly five mobile tabs in order: today, train, food, mind, crew", () => {
    const keys = [...bar.matchAll(/labelKey:\s*"(\w+)"/g)].map((m) => m[1]);
    expect(keys).toEqual(["today", "train", "food", "mind", "crew"]);
  });

  it("drops the dead messages badge from the tab bar", () => {
    expect(bar).not.toContain('"/messages"');
    expect(bar).not.toMatch(/unreadMessages/);
  });

  it("marks the active tab with the Kalk signal stroke and an ink label (spec §6)", () => {
    expect(css).toMatch(/\.tab\[data-active="true"\]::before\s*\{[^}]*var\(--signal\)/);
    expect(css).not.toMatch(/\.tab\[data-domain\]\[data-active="true"\]/);
  });

  it("reaches Me, Reps, HRV and Science from the mobile header menu", () => {
    const menu = shell.slice(shell.indexOf("data-mobile-menu"), shell.indexOf("</details>", shell.indexOf("data-mobile-menu")));
    expect(menu.length).toBeGreaterThan(0);
    for (const href of ["/profile", "/reps", "/hrv", "/science"]) expect(menu).toContain(`"${href}"`);
    expect(da.shell.menu).toBeTruthy();
  });

  it("describes the five tabs in the first-run tour", () => {
    expect(da.tour.steps.tabs.eyebrow).not.toMatch(/Reps|Mig/);
  });

  it("closes the header menu on navigation, Escape and outside press", () => {
    expect(shell).toMatch(/useEffect\(\(\) => \{[^}]*removeAttribute\("open"\)[\s\S]*?\}, \[pathname\]\)/);
    expect(shell).toContain('"pointerdown"');
    expect(shell).toContain('"Escape"');
    expect(shell).toMatch(/removeEventListener\("pointerdown"/);
    expect(shell).toMatch(/removeEventListener\("keydown"/);
    expect(shell).toMatch(/summaryRef\.current\?\.focus\(\)/);
  });

  it("labels the menu toggle as a menu and keeps the visible avatar", () => {
    const summary = shell.slice(shell.indexOf("<summary"), shell.indexOf("</summary>"));
    expect(summary).toContain('t("shell.menu")');
    expect(summary).not.toContain("shell.myProfile");
    expect(summary).toContain("member.handle.slice(0, 2)");
  });

  it("keeps the tour welcome free of dashes", () => {
    for (const msgs of [da, en]) expect(JSON.stringify(msgs.tour.steps.welcome)).not.toMatch(/[\u2013\u2014]/);
  });
});
