# HRV Module — V1.x: Visualization Layer

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the HRV module feel finished for a member: a trend chart of their HRV history, the 5-bucket readiness ladder wired into the daily view, and a short editorial `/hrv/learn` page. Builds on the shipped W1 WHOOP integration.

**Architecture:** Two new pages under the existing `/hrv` route (`/hrv/trends`, `/hrv/learn`) plus two new components (`TrendChart`, `ReadinessLadder`). The chart is SVG-native (no chart library — keeps the monochrome design control and bundle small). Its geometry is computed by a pure, unit-tested function; the component only renders the resulting model. A small shared `src/lib/data/hrv.ts` data module is extracted so the trends page (and future HRV surfaces) have one place to query reading history.

**Tech Stack:** Next.js 16.2.4 App Router, React 19, Supabase, TypeScript 5, Vitest. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-15-hrv-module-design.md`](../specs/2026-05-15-hrv-module-design.md) revision 4.2 — §6 (UI & visualization) is the source of truth.

**Depends on (shipped):** the W1 WHOOP integration — `/hrv` page, `hrv_readings` table (columns `measured_at`, `rmssd_ms`, `ln_rmssd`, `rolling_7d_mean_lnrmssd`, `baseline_60d_mean_lnrmssd`, `baseline_60d_swc`, `warm_up_state`, `readiness_bucket`, `is_sick`, `connection_id`), `src/lib/hrv/types.ts`.

**Scope notes:**
- The `/dashboard` HRV chip already shipped in W1 — not in this plan.
- `/hrv/learn` is written as **plain editorial copy with no inline scientific citations** — so no PubMed citation-verification pass is needed (the spec's citation caveat only applied if specific papers were cited in-product; they will not be).
- Chart annotations beyond the core (travel/timezone flags, cycle-phase gradient) are deliberately out of scope for V1.x — the core chart is daily points + 7-day mean line + baseline band + sick-day markers. Travel/cycle annotations are noted as later polish.

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `src/lib/hrv/trend-chart.ts` | Pure `buildTrendChartModel()` — readings → SVG-coordinate geometry |
| `src/lib/hrv/trend-chart.test.ts` | Unit tests |
| `src/lib/data/hrv.ts` | HRV data module — reading-series + latest-reading queries |
| `src/components/hrv/TrendChart.tsx` | SVG-native chart, renders a `TrendChartModel` |
| `src/components/hrv/ReadinessLadder.tsx` | 5-bucket vertical readiness ladder |
| `src/app/(app)/hrv/trends/page.tsx` | `/hrv/trends` — chart + bucket distribution, state-aware |
| `src/app/(app)/hrv/learn/page.tsx` | `/hrv/learn` — editorial intro |
| `src/components/hrv/HrvSubNav.tsx` | Links between `/hrv`, `/hrv/trends`, `/hrv/learn` |

**Modified files:**

| Path | Change |
|---|---|
| `src/app/(app)/hrv/page.tsx` | Active state uses `ReadinessLadder`; add `HrvSubNav` |

---

## Chunk 1: Chart geometry + components

### Task 1: Trend-chart geometry (pure, TDD)

**Files:** Create `src/lib/hrv/trend-chart.ts`, `src/lib/hrv/trend-chart.test.ts`

The chart's math lives in a pure function so it is testable without a DOM. `buildTrendChartModel` maps a list of readings + a viewport size into SVG-space geometry.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { buildTrendChartModel, type ChartReading } from "./trend-chart";

function reading(day: number, lnRmssd: number, extra: Partial<ChartReading> = {}): ChartReading {
  return {
    measuredAt: `2026-05-${String(day).padStart(2, "0")}T06:00:00.000Z`,
    lnRmssd,
    rolling7dMeanLnRmssd: lnRmssd,
    baseline60dMeanLnRmssd: lnRmssd,
    baseline60dSwc: 0.1,
    readinessBucket: null,
    isSick: false,
    ...extra,
  };
}

describe("buildTrendChartModel", () => {
  it("returns an empty model for no readings", () => {
    const m = buildTrendChartModel([], { width: 600, height: 200 });
    expect(m.points).toEqual([]);
    expect(m.isEmpty).toBe(true);
  });

  it("maps each reading to a point inside the viewport", () => {
    const readings = [reading(1, 3.4), reading(2, 3.6), reading(3, 3.5)];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.points).toHaveLength(3);
    for (const p of m.points) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(600);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(200);
    }
  });

  it("places a higher lnRMSSD higher on the chart (smaller y)", () => {
    const readings = [reading(1, 3.0), reading(2, 4.0)];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.points[1].y).toBeLessThan(m.points[0].y);
  });

  it("produces a baseline band with top above bottom", () => {
    const readings = [reading(1, 3.5), reading(2, 3.6), reading(3, 3.4)];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.baselineBand).not.toBeNull();
    // band top (baseline+SWC) sits at a smaller y than band bottom (baseline-SWC)
    expect(m.baselineBand!.topY).toBeLessThan(m.baselineBand!.bottomY);
  });

  it("flags sick readings on their points", () => {
    const readings = [reading(1, 3.5), reading(2, 3.4, { isSick: true })];
    const m = buildTrendChartModel(readings, { width: 600, height: 200 });
    expect(m.points[1].isSick).toBe(true);
  });

  it("exposes ms-valued y-axis ticks (inverse log of lnRMSSD)", () => {
    const m = buildTrendChartModel([reading(1, 3.5), reading(2, 3.7)], { width: 600, height: 200 });
    expect(m.yTicks.length).toBeGreaterThan(0);
    for (const t of m.yTicks) {
      expect(t.label).toMatch(/ms$/); // e.g. "33 ms"
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL** (`npm test -- trend-chart`).

- [ ] **Step 3: Implement `trend-chart.ts`**

Export (`ChartReading` imports `ReadinessBucket` from `@/lib/hrv/types`):
- `interface ChartReading { measuredAt: string; lnRmssd: number; rolling7dMeanLnRmssd: number | null; baseline60dMeanLnRmssd: number | null; baseline60dSwc: number | null; readinessBucket: ReadinessBucket | null; isSick: boolean }` — `readinessBucket` is carried for the trends page's bucket-distribution row; `buildTrendChartModel` itself ignores it.
- `interface ChartViewport { width: number; height: number }`
- `interface TrendChartModel { isEmpty: boolean; points: { x: number; y: number; isSick: boolean }[]; meanLinePath: string; baselineBand: { topY: number; bottomY: number; path: string } | null; yTicks: { y: number; label: string }[]; xTicks: { x: number; label: string }[] }`
- `function buildTrendChartModel(readings: ChartReading[], viewport: ChartViewport): TrendChartModel`

Behavior: compute a y-domain from the lnRMSSD range across readings + the baseline band, with a small padding margin; map each reading's `measuredAt` to an x by its index/date order across the viewport width; higher lnRMSSD → smaller y. The mean line is an SVG path string through the `rolling7dMeanLnRmssd` values. The baseline band is the area between `baseline60dMeanLnRmssd + swc` (topY) and `− swc` (bottomY) using the most recent reading's baseline values (the band is shown as a single horizontal-ish region — for V1.x render it as a flat band from the latest baseline; a per-day band is later polish). `yTicks` convert lnRMSSD back to ms via `Math.round(Math.exp(ln))` and label `"<n> ms"`. Pure — no DOM, no Date-now dependence. Leave a reserved inner margin (e.g. 24px) so points/ticks are not flush to the edges.

- [ ] **Step 4: Run — expect PASS.** `npx tsc --noEmit` clean. Commit `feat(hrv): trend-chart geometry`.

### Task 2: `ReadinessLadder` component

**Files:** Create `src/components/hrv/ReadinessLadder.tsx`

- [ ] **Step 1: Implement** a presentational component (no `"use client"` needed if it has no interactivity — a pure render component). Props: `bucket: ReadinessBucket | null` (import from `@/lib/hrv/types`). Renders a **vertical 5-segment ladder**, bottom-up: `very_low, low, normal, high, very_high`. The segment matching `bucket` is a filled block; immediate neighbours are outline; distant segments are thin sketch lines (per spec §6). Each segment has a redundant text label visible to screen readers (e.g. `aria-label` / visually-hidden text) — "under din norm", "i dit normale område", etc. Monochrome only — fill/stroke-weight, no color. If `bucket` is `null` (warming up), render the ladder in a neutral all-outline state with a caption "Readiness kommer når din baseline er klar". Read an existing component for the design-token classes.

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` — clean. Commit `feat(hrv): ReadinessLadder component`.

### Task 3: `TrendChart` component

**Files:** Create `src/components/hrv/TrendChart.tsx`

- [ ] **Step 1: Implement** a component that takes `readings: ChartReading[]` (+ optional `rangeDays`), calls `buildTrendChartModel`, and renders an inline `<svg>`: the baseline band as a translucent rect/region (~15% opacity), the 7-day mean line as a 1.5px path, daily points as small dots (sick readings as hollow/outline dots), y-axis ms ticks, x-axis date ticks. Monochrome (`currentColor` / design tokens), no color accents. Include a `<title>`/`<desc>` and a visually-hidden data-table fallback of the underlying readings for accessibility. Responsive: accept the rendered width or use a sensible fixed viewBox that scales. Keep the SVG rendering thin — all math is already in `buildTrendChartModel`.

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` — clean. Commit `feat(hrv): TrendChart SVG component`.

---

## Chunk 2: Data module + pages

### Task 4: HRV data module

**Files:** Create `src/lib/data/hrv.ts`

- [ ] **Step 1: Implement** a server-side data module. Read `src/lib/data/settings.ts` for the existing data-module pattern (dual-mode: real Supabase vs demo/mock) — note it already has `getMemberHrvSettings` which lists connections, so **do not** add a connection-list function here (no V1.x task needs one). Export exactly two functions:
  - `getHrvReadingSeries(memberId, opts?: { rangeDays?: number }): Promise<ChartReading[]>` — the member's `hrv_readings` for their **current primary connection only** (spec §5: the baseline/chart reads only the primary connection's readings). Concrete two-step query in connected mode:
    1. `select id from hrv_wearable_connections where member_id = <memberId> and is_primary = true` via `.maybeSingle()`. If there is no primary connection → return `[]`.
    2. `select measured_at, ln_rmssd, rolling_7d_mean_lnrmssd, baseline_60d_mean_lnrmssd, baseline_60d_swc, readiness_bucket, is_sick from hrv_readings where connection_id = <that id> order by measured_at asc` (apply `rangeDays` as a `measured_at >=` cutoff if given).
    Map each snake_case row → camelCase `ChartReading` (`measured_at`→`measuredAt`, `ln_rmssd`→`lnRmssd`, `rolling_7d_mean_lnrmssd`→`rolling7dMeanLnRmssd`, `baseline_60d_mean_lnrmssd`→`baseline60dMeanLnRmssd`, `baseline_60d_swc`→`baseline60dSwc`, `readiness_bucket`→`readinessBucket`, `is_sick`→`isSick`). **Demo mode (`!SUPABASE_ENABLED` / no client) → return `[]`** (flatly — deterministic empty state, no mock store).
  - `getLatestHrvReading(memberId): Promise<HrvReading | null>` — latest reading (extraction of what `/hrv/page.tsx` already does inline; the W1 nav task flagged this). Connected mode only; demo → `null`.
  Keep it focused; do not refactor the existing `/hrv` page in this task (Task 7 does the page touch-ups).

- [ ] **Step 2:** `npx tsc --noEmit` clean. Commit `feat(hrv): shared HRV data module`.

### Task 5: `/hrv/trends` page

**Files:** Create `src/app/(app)/hrv/trends/page.tsx`

- [ ] **Step 1: Implement** a server component. Resolve the member, call `getHrvReadingSeries`. Render state-aware (spec §6):
  - **Empty (0 readings):** faint chart-axis scaffold + copy "Vi viser dit forløb her, så snart vi har data. Dine målinger ligger trygt gemt."
  - **Provisional (1–13 readings):** render `<TrendChart>` with the points + mean line but **no baseline band** (baseline not mature) + copy "Vi bygger din baseline. Når den er klar, kommer båndet."
  - **Active (≥14 readings):** full `<TrendChart>` incl. baseline band; below it a **bucket-distribution** row — 5 horizontal bars sized by the share of the last 30 days in each readiness bucket. Compute it in the page from the `ChartReading[]` the data module returns: take the last-30-days slice, tally each reading's `readinessBucket` (skip `null`), and size the 5 bars by share. Caption like "Dine sidste 30 dage: 65% normal, 18% under, ...".
  Use `PageHeader` + `HrvSubNav` (Task 6/8). Demo mode → empty state. Monochrome.

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` clean. Manual: `npm run dev`, visit `/hrv/trends`. Commit `feat(hrv): /hrv/trends page`.

### Task 6: `/hrv/learn` page

**Files:** Create `src/app/(app)/hrv/learn/page.tsx`

- [ ] **Step 1: Implement** a static server component — short editorial intro, 5 sections, ≤100 words each, **plain language, no inline scientific citations**:
  1. *Hvad er HRV?* — beat-to-beat variation, autonome nervesystem, proxy for restitution.
  2. *Hvorfor RMSSD?* — den robuste metric for korte/daglige målinger; vi viser den, ikke et fabrikeret tal.
  3. *Hvorfor du ikke får et 0-100 score* — pseudo-præcision; vi viser dit faktiske tal + dit eget baseline-bånd.
  4. *Hvorfor du ikke kan sammenligne din HRV med andres* — sundt RMSSD spænder 10-200 ms; kun din egen baseline betyder noget.
  5. *Cyklus & HRV* — for kvindelige medlemmer: HRV varierer over menstruationscyklussen; slå cyklus-tracking til i Settings.
  Editorial tone, narrow text column, monochrome, `PageHeader` + `HrvSubNav`. No illustrations.

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` clean. Commit `feat(hrv): /hrv/learn page`.

### Task 7: Sub-nav + `/hrv` active-state ladder

**Files:** Create `src/components/hrv/HrvSubNav.tsx`; Modify `src/app/(app)/hrv/page.tsx`

- [ ] **Step 1: Implement `HrvSubNav`** — a small client component (`"use client"`, uses `usePathname`) rendering links: I dag (`/hrv`) · Forløb (`/hrv/trends`) · Lær (`/hrv/learn`), with the active one marked. Monochrome, matches the app's nav styling.

- [ ] **Step 2: Modify `/hrv/page.tsx`** — (a) render `<HrvSubNav>` near the top, shared across all states; (b) **only inside the `StateActive` branch**, add `<ReadinessLadder bucket={latest.readinessBucket} />` alongside the existing RMSSD value + readiness text — the ladder *complements*, does not replace, the text and the `READINESS_LABEL` mapping stay. **Do not touch** the no-connection, warming-up, needs-reauth, or pending-first-sync branches (warming-up may optionally show the neutral ladder only if trivially clean — otherwise leave it). The four non-active W1 states must render exactly as before.

- [ ] **Step 3:** `npx tsc --noEmit && npm run lint` clean. Manual: `/hrv`, `/hrv/trends`, `/hrv/learn` all reachable via the sub-nav; active state shows the ladder. Commit `feat(hrv): HRV sub-nav + readiness ladder on /hrv`.

### Task 8: V1.x verification

- [ ] **Step 1:** `npm test` — all green (incl. the new `trend-chart` tests).
- [ ] **Step 2:** `npx tsc --noEmit && npm run lint && npm run build` — all pass; `/hrv/trends` and `/hrv/learn` compile.
- [ ] **Step 3: Manual E2E** — `npm run dev`, log in, walk `/hrv` → `/hrv/trends` → `/hrv/learn` via the sub-nav. With the dogfood WHOOP data present, `/hrv/trends` shows the provisional chart.
- [ ] **Step 4:** Final commit `chore(hrv): V1.x verification — visualization layer complete`.

---

## Done — V1.x complete

The HRV module now has a daily readiness view with the ladder, a trend chart, and an editorial intro. **Not in V1.x:** chart travel/cycle annotations (later polish), Oura/Polar providers (W2/W3), the iOS companion (W4), and V2 (lifestyle logs, Claude insights, session integration, coach queue, adaptive periodization).
