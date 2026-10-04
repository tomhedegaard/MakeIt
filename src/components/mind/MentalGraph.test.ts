/**
 * MentalGraph is presentational SVG. These tests lock the straight,
 * in-scale strokes (no overshooting curve, no area washes), gap-break,
 * and inverted stress.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MentalGraph, { type MentalGraphCopy } from "./MentalGraph";
import type { MindCheckLog } from "@/lib/mind/types";
import { utcDateNDaysAgo } from "@/lib/mind/streak";
import daMind from "../../../messages/da/Mind.json";

const copy = daMind.graph as MentalGraphCopy;

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
  return renderToStaticMarkup(createElement(MentalGraph, { logs, days, copy }));
}

function pathD(html: string, token: string): string {
  const re = new RegExp(
    `<path d="([^"]+)" fill="none" stroke="${token.replace(/[()]/g, "\\$&")}"`,
  );
  const m = html.match(re);
  return m?.[1] ?? "";
}

describe("MentalGraph", () => {
  it("draws straight in-scale segments without area fills", () => {
    const html = render(
      [3, 2, 1, 0].map((ago, i) => log(ago, [1, 5, 1, 5][i]!, 2, 4)),
      8,
    );

    expect(html).not.toMatch(/<path[^>]*fill-opacity/);
    expect(html).not.toContain("mix-blend-mode");

    const energy = pathD(html, "var(--mind-energy)");
    expect(energy).toMatch(/ L /);
    expect(energy).not.toContain("C ");
    expect(energy).not.toMatch(/NaN/);

    // Every vertex sits on or between the 5 and 1 grid lines.
    const gridYs = [...html.matchAll(/<line[^>]*y1="([\d.]+)"/g)].map((m) => Number(m[1]));
    const top = Math.min(...gridYs);
    const bottom = Math.max(...gridYs);
    const ys = [...energy.matchAll(/[ML] [\d.]+ ([\d.]+)/g)].map((m) => Number(m[1]));
    expect(ys.length).toBe(4);
    for (const yv of ys) {
      expect(yv).toBeGreaterThanOrEqual(top - 0.1);
      expect(yv).toBeLessThanOrEqual(bottom + 0.1);
    }

    // Grid and frame are the theme's own lines (Nord, spec §11).
    expect(html).toContain('stroke="var(--line)"');
    expect(html).not.toMatch(/linearGradient|url\(#/);
    expect(html).toContain("var(--mind-stress)");
    expect(html).toContain("var(--mind-focus)");
    expect(html).toContain("vector-effect");
    expect(html).not.toContain("rounded-full");
  });

  it("holds the series apart without colour and keeps labels out of the SVG", () => {
    const html = render([log(1, 2, 4, 3), log(0, 4, 2, 5)], 8);
    // Dash patterns + a legend, so colour is not the only cue.
    expect(html).toContain('stroke-dasharray="6 4"');
    expect(html).toContain('stroke-dasharray="1 4"');
    expect(html).toContain("<ul");
    // Axis labels are HTML (no 3–5 px SVG text at phone width).
    expect(html).not.toContain("<text");
    // Data table fallback carries every logged day, stress inverted to calm.
    expect(html).toContain('<table class="sr-only">');
    expect(html).toMatch(/<td>4<\/td><td>4<\/td><td>5<\/td>/);
  });

  it("shows a quiet charcoal frame when there are no logs", () => {
    const html = render([], 8);
    expect(html).toContain("data-chart-empty");
    expect(html).toContain("Mental graf · sidste 30 dage");
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
