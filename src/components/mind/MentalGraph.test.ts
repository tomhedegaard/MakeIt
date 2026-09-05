/**
 * MentalGraph is presentational SVG. These tests lock the smooth
 * Catmull-Rom stroke, stacked dosage fills, gap-break, and inverted
 * stress so a polyline regression cannot land unnoticed.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MentalGraph from "./MentalGraph";
import type { MindCheckLog } from "@/lib/mind/types";
import { utcDateNDaysAgo } from "@/lib/mind/streak";

function log(
  daysAgo: number,
  energy: number,
  stress: number,
  focus: number,
): MindCheckLog {
  const date = utcDateNDaysAgo(daysAgo);
  return {
    id: `mg-${daysAgo}`,
    member_id: "mock",
    logged_at: `${date}T08:00:00.000Z`,
    logged_date: date,
    energy,
    stress,
    focus,
    note: null,
    source: "manual",
    created_at: `${date}T08:00:00.000Z`,
  };
}

function render(logs: MindCheckLog[], days = 30) {
  return renderToStaticMarkup(createElement(MentalGraph, { logs, days }));
}

function pathD(html: string, token: string): string {
  const re = new RegExp(
    `<path d="([^"]+)" fill="none" stroke="${token.replace(/[()]/g, "\\$&")}"`,
  );
  const m = html.match(re);
  return m?.[1] ?? "";
}

describe("MentalGraph", () => {
  it("smooths contiguous days with C commands and stacked series fills", () => {
    const html = render(
      [3, 2, 1, 0].map((ago) => log(ago, 3, 2, 4)),
      8,
    );

    expect(html).toContain('id="mental-graph-fill-energy"');
    expect(html).toContain('id="mental-graph-fill-stress"');
    expect(html).toContain('id="mental-graph-fill-focus"');
    expect(html).toContain("stop-opacity");
    expect(html).toContain("url(#mental-graph-fill-energy)");
    expect(html).not.toContain("mix-blend-mode");
    expect(html).not.toContain("mixBlendMode");

    const energy = pathD(html, "var(--mind-energy)");
    expect(energy).toContain("C ");
    expect(energy).not.toMatch(/ L /);
    expect(energy).not.toMatch(/NaN/);

    expect(html).toContain('stroke="currentColor"');
    expect(html).toContain("var(--mind-stress)");
    expect(html).toContain("var(--mind-focus)");
    expect(html).toContain("vector-effect");
    expect(html).not.toContain("rounded-full");
  });

  it("shows a quiet charcoal frame when there are no logs", () => {
    const html = render([], 8);
    expect(html).toContain("data-chart-empty");
    expect(html).toContain("Mental graf — sidste 30 dage");
    expect(html).not.toContain('id="mental-graph-fill-energy"');
  });

  it("breaks the path on a missing day instead of interpolating", () => {
    const html = render([log(6, 3, 3, 3), log(5, 4, 2, 4), log(1, 3, 3, 3), log(0, 4, 2, 4)], 8);
    const energy = pathD(html, "var(--mind-energy)");
    expect(energy.match(/M /g) ?? []).toHaveLength(2);
    expect(energy).not.toMatch(/NaN/);
  });

  it("inverts stress so low stress sits high on the chart", () => {
    const calm = render([log(0, 3, 1, 3)], 2);
    const tense = render([log(0, 3, 5, 3)], 2);
    const calmY = Number(pathD(calm, "var(--mind-stress)").match(/M [\d.]+ ([\d.]+)/)?.[1]);
    const tenseY = Number(pathD(tense, "var(--mind-stress)").match(/M [\d.]+ ([\d.]+)/)?.[1]);
    expect(calmY).toBeLessThan(tenseY);
    expect(Number.isFinite(calmY)).toBe(true);
    expect(Number.isFinite(tenseY)).toBe(true);
  });
});
