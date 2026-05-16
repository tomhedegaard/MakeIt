# HRV Module — Phase 0 + Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the HRV measurement core to MakeIt HQ — members can record a 60-second morning HRV reading via smartphone camera, the reading is processed into lnRMSSD, persisted with an incrementally-computed baseline, and surfaced on a new `/hrv` page. Internal pilot quality (Munk + 3-5 crew).

**Architecture:** A new top-level `/hrv` route. Pure-function algorithm core in `src/lib/hrv/` (PPG signal processing, RMSSD math, rolling baseline) — fully unit-tested. A camera-capture component (`PPGCanvas`) feeds raw R-R intervals to a server action that computes derived values and writes to a new set of Supabase tables (migration `0031`). A nightly Vercel Cron handler tracks measurement streaks. The module follows the existing dual-mode pattern (real Supabase when env is set, in-memory mock otherwise).

**Tech Stack:** Next.js 16.2.4 (App Router), React 19.2.4, TypeScript 5, Supabase (Postgres + RLS), Zod 4, Vitest (new — added by this plan), Web APIs (`getUserMedia`, Canvas).

**Spec:** [`docs/superpowers/specs/2026-05-15-hrv-module-design.md`](../specs/2026-05-15-hrv-module-design.md) — read §4, §5, §9, §11 before starting.

**Scope of this plan:** Spec phases **P0 (feasibility spike)** and **P1 (measurement core)** only. Spec phases P2-P8 (trends visualization, lifestyle logs, insights, Polar, session integration, coach queue, adaptive periodization) are deliberately out of scope and get their own plans after P1 ships and real pilot data exists.

**Deviations from spec (intentional, flagged):**
- Spec §1/§3 assumed the mobile tab-bar has a 5-tab maximum. It actually has **7 tabs already** (`src/components/app/MobileTabBar.tsx`). This plan adds HRV as an 8th entry to both navs rather than replacing Reps. If 8 tabs is too crowded, that is a design follow-up — not a P1 blocker.
- Spec assumed a test runner exists. It does not. Task 1 adds Vitest.

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config (jsdom + node environments) |
| `supabase/migrations/0031_hrv_module.sql` | 7 HRV tables + RLS policies |
| `src/lib/hrv/rmssd.ts` | R-R intervals → RMSSD + ectopic filtering. Pure. |
| `src/lib/hrv/rmssd.test.ts` | Unit tests for rmssd.ts |
| `src/lib/hrv/baseline.ts` | Rolling 7d/60d means, SWC, warm-up-state, readiness bucket. Pure. |
| `src/lib/hrv/baseline.test.ts` | Unit tests for baseline.ts |
| `src/lib/hrv/ppg.ts` | PPG sample stream → R-R intervals (detrend, bandpass, peak detect, SNR). Pure. |
| `src/lib/hrv/ppg.test.ts` | Unit tests for ppg.ts |
| `src/lib/hrv/types.ts` | Shared HRV TypeScript types |
| `src/lib/hrv/mock.ts` | In-memory mock store for demo mode (no Supabase) |
| `src/components/hrv/PPGCanvas.tsx` | getUserMedia + canvas red-channel sampling |
| `src/components/hrv/MeasurementSheet.tsx` | Bottom-sheet measurement flow (FormCheckSheet pattern) |
| `src/app/(app)/hrv/page.tsx` | `/hrv` morning destination — 3 states |
| `src/app/(app)/hrv/actions.ts` | `submitHrvReading` server action |
| `src/app/api/cron/hrv-streak-check/route.ts` | Nightly streak cron handler |
| `src/app/api/cron/hrv-alert-detect/route.ts` | Alert-detect cron — verified stub until P7 |
| `src/app/api/cron/hrv-weekly-insights/route.ts` | Weekly-insights cron — verified stub until P4 |
| `vercel.json` | Cron schedule registration (3 crons) |

**Modified files:**

| Path | Change |
|---|---|
| `package.json` | Add `vitest` devDependency + `test` script |
| `.env.example` | Add `CRON_SECRET` with setup notes |
| `src/components/app/AppShell.tsx` | Add `/hrv` to desktop sidebar nav |
| `src/components/app/MobileTabBar.tsx` | Add `/hrv` to mobile tab-bar |
| `src/lib/supabase/database.types.ts` | Regenerated after migration |
| `src/app/(app)/settings/page.tsx` | Add HRV settings section (verify exact path during Task 12) |

---

## Chunk 1: Foundations — test runner, migration, types

### Task 0: Phase 0 feasibility spike (NOT TDD — a research spike, gates P1)

**Goal:** Validate camera-PPG works well enough on real devices before committing to P1. Output is a findings document, not code.

**Files:**
- Create: `docs/research/HRV_PPG_SPIKE_FINDINGS.md`

- [ ] **Step 1: Build a throwaway PPG capture probe**

Create a minimal standalone HTML/JS page (does not need to live in the repo — a scratch file is fine) that:
- Calls `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`.
- On Android Chrome, attempts `track.applyConstraints({ advanced: [{ torch: true }] })`.
- Draws each frame to a canvas and logs mean red-channel intensity of a 100×100 px center ROI at 30 Hz.
- Records 60 seconds of samples and downloads them as JSON.

- [ ] **Step 2: Capture reference data on 3-5 pilot devices**

For each available device (must include at least one Android Chrome phone AND one iPhone running Safari 15.4+):
- Record a 60s PPG sample with finger on camera.
- Simultaneously, if a Polar H10 is available, record a synchronous reference reading.

- [ ] **Step 3: Validate signal quality**

For each captured sample, run it through a notebook/script implementing the §4 algorithm (bandpass 0.5-3 Hz + adaptive-threshold peak detection). Check:
- Frame rate stayed ≥ 25 fps (below this, R-R resolution degrades).
- Detected peak count is plausible (≈ HR × 1 minute).
- If Polar H10 reference exists: Pearson r ≥ 0.9 between PPG-derived R-R and H10-derived R-R.

- [ ] **Step 4: Write findings + go/no-go**

Write `docs/research/HRV_PPG_SPIKE_FINDINGS.md` covering: torch availability per platform, frame-rate stability, SNR observed, correlation with H10 (if measured), and an explicit **GO** / **GO-WITH-CHANGES** / **NO-GO** recommendation.

- If **NO-GO** (camera PPG unusable): stop. Surface to the human — P1 needs rethinking (e.g., Polar-H10-only v1).
- If **GO-WITH-CHANGES**: note the algorithm changes needed; carry them into Task 6.
- If **GO**: proceed to Task 1.

- [ ] **Step 5: Commit findings**

```bash
git add docs/research/HRV_PPG_SPIKE_FINDINGS.md
git commit -m "docs(hrv): P0 PPG feasibility spike findings"
```

---

### Task 1: Add Vitest test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install --save-dev vitest@^3 @vitest/coverage-v8@^3 jsdom@^25
```
Expected: packages added to `devDependencies`, no peer-dependency errors.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["src/lib/hrv/**"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
```

- [ ] **Step 3: Add `test` script to `package.json`**

In the `scripts` block, add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create a smoke test to verify the runner works**

Create `src/lib/hrv/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";

describe("vitest smoke", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test`
Expected: PASS — 1 test passed.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/lib/hrv/smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

### Task 2: HRV shared types

**Files:**
- Create: `src/lib/hrv/types.ts`

- [ ] **Step 1: Write the types file**

```ts
/** Source of an HRV reading. 'apple_health_sdnn' reserved for v2. */
export type HrvSource = "camera_ppg" | "polar_h10";

export type HrvConfidence = "high" | "medium" | "low";

/** Maturity of a member's baseline, derived from count of valid readings. */
export type WarmUpState = "discovery" | "provisional" | "active";

/** Readiness bucket — only meaningful when warmUpState === 'active'. */
export type ReadinessBucket =
  | "very_low"
  | "low"
  | "normal"
  | "high"
  | "very_high";

/** A single completed HRV reading with derived values. */
export interface HrvReading {
  id: string;
  memberId: string;
  measuredAt: string; // ISO timestamp
  source: HrvSource;
  confidence: HrvConfidence;
  rmssdMs: number;
  lnRmssd: number;
  meanHrBpm: number | null;
  rolling7dMeanLnRmssd: number | null;
  baseline60dMeanLnRmssd: number | null;
  baseline60dSwc: number | null;
  warmUpState: WarmUpState;
  readinessBucket: ReadinessBucket | null;
  timezone: string;
  isSick: boolean;
}

/** Quality metrics attached to a reading. */
export interface HrvQuality {
  ectopicPct: number;
  snrDb: number;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/hrv/types.ts
git commit -m "feat(hrv): shared HRV types"
```

---

### Task 3: Migration `0031_hrv_module.sql`

**Files:**
- Create: `supabase/migrations/0031_hrv_module.sql`

**Reference:** Spec §9 (full DDL). Follow the idempotent style of existing migrations (`create table if not exists`, header comment block, `public.` prefix). Table-creation order MUST respect FK dependencies: `hrv_settings` → `hrv_session_modifiers` → `hrv_alerts` → `hrv_readings` → `hrv_lifestyle_logs` → `hrv_weekly_insights` → `hrv_streak_events`.

- [ ] **Step 1: Write the migration file**

Write the full file using the DDL from spec §9, in the FK-safe order above. Include **every** column shown in the §9 DDL for each of the 7 tables — including nullable ones like `hrv_readings.cycle_phase`, `quality_warnings`, `is_sick` — plus the two `hrv_readings` indexes (`(member_id, measured_at desc)` and the partial `(member_id, is_sick) where is_sick = false`), the `hrv_alerts` partial index, the `hrv_lifestyle_logs` index, and the `hrv_session_modifiers` index. Do not abbreviate — "verbatim" means all columns, all CHECK constraints, all indexes. Header comment block:
```sql
-- =================================================================
-- MakeIt // HQ — HRV module (Phase 1)
-- =================================================================
-- Adds 7 tables for the HRV measurement module: readings, lifestyle
-- logs, alerts, weekly insights, settings, session modifiers, streak
-- events. All RLS-enabled. See docs/superpowers/specs for design.
-- Additive only — no changes to existing tables.
```
Use `create table if not exists` for every table. Add all RLS policies from spec §9 verbatim (including `public.is_current_user_coach()`). Wrap each `create policy` so re-runs don't fail:
```sql
drop policy if exists "members_own_readings" on public.hrv_readings;
create policy "members_own_readings" on public.hrv_readings for all using (member_id = auth.uid());
```
(Repeat the `drop policy if exists` / `create policy` pairing for every policy.)

- [ ] **Step 2: Lint the migration**

Run: `npm run db:lint`
Expected: no errors. (If `supabase` CLI is not linked locally, skip with a note — the migration will be validated on first `db:push`.)

- [ ] **Step 3: Apply to a local/staging database**

Run: `npm run db:reset` (local) — applies all migrations including 0031.
Expected: all migrations apply cleanly, no FK or policy errors.

- [ ] **Step 4: Verify idempotency**

Run the 0031 migration SQL a second time against the same database (paste into Supabase SQL editor or `psql`).
Expected: no errors — every statement is idempotent.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0031_hrv_module.sql
git commit -m "feat(hrv): migration 0031 — HRV module tables + RLS"
```

---

### Task 4: Regenerate Supabase types

**Files:**
- Modify: `src/lib/supabase/database.types.ts`

- [ ] **Step 1: Regenerate types**

Run: `npm run db:types`
Expected: `src/lib/supabase/database.types.ts` now includes the 7 `hrv_*` tables.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/database.types.ts
git commit -m "chore(hrv): regenerate Supabase types for 0031"
```

---

## Chunk 2: HRV algorithm core (pure functions, full TDD)

> This is the scientific core. Every function is pure and exhaustively tested. Test vectors: synthetic signals with known properties + at least one real-world R-R series (from PhysioNet or the P0 spike capture). The §4/§5 spec sections are the source of truth for every formula.

### Task 5: RMSSD computation + ectopic filter

**Files:**
- Create: `src/lib/hrv/rmssd.ts`
- Test: `src/lib/hrv/rmssd.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { filterEctopic, computeRmssd, computeLnRmssd, computeMeanHr } from "./rmssd";

describe("filterEctopic", () => {
  it("keeps a clean R-R series unchanged", () => {
    const rr = [850, 860, 855, 865, 858, 862];
    const { clean, ectopicPct } = filterEctopic(rr);
    expect(clean).toEqual(rr);
    expect(ectopicPct).toBe(0);
  });

  it("drops an interval >25% from the moving median of the previous 5", () => {
    const rr = [850, 860, 855, 865, 858, 1300, 861]; // 1300 is ectopic
    const { clean, ectopicPct } = filterEctopic(rr);
    expect(clean).not.toContain(1300);
    expect(ectopicPct).toBeGreaterThan(0);
  });
});

describe("computeRmssd", () => {
  it("returns 0 for a perfectly constant series", () => {
    expect(computeRmssd([800, 800, 800, 800])).toBe(0);
  });

  it("computes the root mean square of successive differences", () => {
    // diffs: 10, -10, 10 -> squares: 100,100,100 -> mean 100 -> sqrt 10
    expect(computeRmssd([800, 810, 800, 810])).toBeCloseTo(10, 5);
  });

  it("throws on a series shorter than 2 intervals", () => {
    expect(() => computeRmssd([800])).toThrow();
  });
});

describe("computeLnRmssd", () => {
  it("is the natural log of RMSSD", () => {
    expect(computeLnRmssd(20)).toBeCloseTo(Math.log(20), 5);
  });
});

describe("computeMeanHr", () => {
  it("converts mean R-R to bpm", () => {
    // mean R-R 1000ms -> 60 bpm
    expect(computeMeanHr([1000, 1000, 1000])).toBeCloseTo(60, 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- rmssd`
Expected: FAIL — module/exports not defined.

- [ ] **Step 3: Implement `src/lib/hrv/rmssd.ts`**

```ts
/**
 * R-R interval math for HRV. All inputs are arrays of inter-beat
 * intervals in milliseconds. See spec §4 (ectopic filter) and §5
 * (RMSSD / lnRMSSD).
 */

const ECTOPIC_DEVIATION = 0.25; // 25% — spec §4
const ECTOPIC_WINDOW = 5; // moving median of previous 5 intervals

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Removes ectopic beats: any interval deviating >25% from the moving
 * median of the previous up-to-5 accepted intervals is dropped.
 */
export function filterEctopic(rr: number[]): {
  clean: number[];
  ectopicPct: number;
} {
  if (rr.length === 0) return { clean: [], ectopicPct: 0 };
  const clean: number[] = [];
  let dropped = 0;
  for (const interval of rr) {
    if (clean.length === 0) {
      clean.push(interval);
      continue;
    }
    const window = clean.slice(-ECTOPIC_WINDOW);
    const ref = median(window);
    if (Math.abs(interval - ref) / ref > ECTOPIC_DEVIATION) {
      dropped += 1;
    } else {
      clean.push(interval);
    }
  }
  return { clean, ectopicPct: (dropped / rr.length) * 100 };
}

/** RMSSD — root mean square of successive differences (ms). */
export function computeRmssd(rr: number[]): number {
  if (rr.length < 2) {
    throw new Error("computeRmssd requires at least 2 intervals");
  }
  let sumSq = 0;
  for (let i = 1; i < rr.length; i++) {
    const diff = rr[i] - rr[i - 1];
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / (rr.length - 1));
}

/** Natural log of RMSSD — the value all baseline math operates on. */
export function computeLnRmssd(rmssd: number): number {
  return Math.log(rmssd);
}

/** Mean heart rate (bpm) from an R-R series. */
export function computeMeanHr(rr: number[]): number {
  if (rr.length === 0) throw new Error("computeMeanHr requires intervals");
  const meanRr = rr.reduce((a, b) => a + b, 0) / rr.length;
  return 60000 / meanRr;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- rmssd`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hrv/rmssd.ts src/lib/hrv/rmssd.test.ts
git commit -m "feat(hrv): RMSSD computation + ectopic filter"
```

---

### Task 6: PPG signal processing

**Files:**
- Create: `src/lib/hrv/ppg.ts`
- Test: `src/lib/hrv/ppg.test.ts`

**Note:** If the P0 spike (Task 0) returned GO-WITH-CHANGES, apply the noted algorithm changes here.

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import { detrend, bandpass, detectPeaks, computeSnrDb, ppgToRrIntervals } from "./ppg";

/** Synthesize a clean PPG signal: sine at `hz`, `sampleRate` Hz, `seconds` long. */
function synthPpg(hz: number, sampleRate: number, seconds: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < sampleRate * seconds; i++) {
    out.push(Math.sin((2 * Math.PI * hz * i) / sampleRate));
  }
  return out;
}

describe("detrend", () => {
  it("removes a linear brightness ramp", () => {
    const ramp = Array.from({ length: 100 }, (_, i) => i * 0.5);
    const out = detrend(ramp);
    // after detrending a pure ramp, values should be near zero
    expect(Math.max(...out.map(Math.abs))).toBeLessThan(1);
  });
});

describe("detectPeaks", () => {
  it("finds one peak per cycle in a clean 1 Hz signal at 30 Hz", () => {
    const signal = synthPpg(1, 30, 10); // 10 seconds, 1 Hz -> ~10 peaks
    const peaks = detectPeaks(signal, 30);
    expect(peaks.length).toBeGreaterThanOrEqual(9);
    expect(peaks.length).toBeLessThanOrEqual(11);
  });

  it("respects the 300ms refractory period", () => {
    const signal = synthPpg(1, 30, 10);
    const peaks = detectPeaks(signal, 30);
    for (let i = 1; i < peaks.length; i++) {
      const gapMs = ((peaks[i] - peaks[i - 1]) / 30) * 1000;
      expect(gapMs).toBeGreaterThanOrEqual(300);
    }
  });
});

describe("computeSnrDb", () => {
  it("reports high SNR for a clean in-band signal", () => {
    const signal = synthPpg(1, 30, 10); // 1 Hz is in the 0.5-3 Hz band
    expect(computeSnrDb(signal, 30)).toBeGreaterThan(3);
  });
});

describe("ppgToRrIntervals", () => {
  it("derives ~1000ms R-R intervals from a clean 1 Hz signal", () => {
    const signal = synthPpg(1, 30, 30);
    const { rrIntervals } = ppgToRrIntervals(signal, 30);
    const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    expect(mean).toBeGreaterThan(900);
    expect(mean).toBeLessThan(1100);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- ppg`
Expected: FAIL — module/exports not defined.

- [ ] **Step 3: Implement `src/lib/hrv/ppg.ts`**

Per spec §4. If the P0 spike (Task 0) returned GO-WITH-CHANGES, apply the noted algorithm changes as a diff against this baseline implementation:

```ts
/**
 * PPG signal processing — converts a stream of camera red-channel
 * intensity samples into R-R intervals. See spec §4.
 *
 * Filter choice: a difference-of-moving-averages bandpass is used
 * instead of a Butterworth biquad. For a 30 Hz input and the wide
 * 0.5-3 Hz passband this is numerically stable, dependency-free,
 * and accurate enough — a moving average of window W is a lowpass
 * with cutoff ~sampleRate/(2W). Bandpass = shortMA - longMA.
 */

const LOW_HZ = 0.5;
const HIGH_HZ = 3;
const REFRACTORY_MS = 300;
const THRESHOLD_FRACTION = 0.3; // peak must exceed mean + 0.3*(max-mean)
const WINDOW_SECONDS = 5;

/** Subtract a degree-2 polynomial least-squares fit (removes drift). */
export function detrend(samples: number[]): number[] {
  const n = samples.length;
  if (n < 3) return [...samples];
  // Normal equations for y = a0 + a1*x + a2*x^2.
  let s0 = n, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < n; i++) {
    const x = i, x2 = x * x, y = samples[i];
    s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2;
    b0 += y; b1 += x * y; b2 += x2 * y;
  }
  // Solve the 3x3 system [s0 s1 s2; s1 s2 s3; s2 s3 s4] * a = [b0 b1 b2].
  const m = [
    [s0, s1, s2, b0],
    [s1, s2, s3, b1],
    [s2, s3, s4, b2],
  ];
  for (let col = 0; col < 3; col++) {
    let pivot = col;
    for (let r = col + 1; r < 3; r++) {
      if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r;
    }
    [m[col], m[pivot]] = [m[pivot], m[col]];
    if (Math.abs(m[col][col]) < 1e-12) return [...samples]; // singular
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = m[r][col] / m[col][col];
      for (let c = col; c < 4; c++) m[r][c] -= f * m[col][c];
    }
  }
  const a0 = m[0][3] / m[0][0];
  const a1 = m[1][3] / m[1][1];
  const a2 = m[2][3] / m[2][2];
  return samples.map((y, i) => y - (a0 + a1 * i + a2 * i * i));
}

/** Centered moving average with the given odd-ish window length. */
function movingAverage(samples: number[], window: number): number[] {
  const n = samples.length;
  const w = Math.max(1, Math.round(window));
  const half = Math.floor(w / 2);
  const out = new Array<number>(n);
  // Prefix sums for O(n).
  const prefix = new Array<number>(n + 1).fill(0);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + samples[i];
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    out[i] = (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
  }
  return out;
}

/** Difference-of-moving-averages bandpass, 0.5-3 Hz. */
export function bandpass(samples: number[], sampleRate: number): number[] {
  const shortWin = sampleRate / (2 * HIGH_HZ); // lowpass at 3 Hz
  const longWin = sampleRate / (2 * LOW_HZ); // lowpass at 0.5 Hz
  const lowpassed = movingAverage(samples, shortWin);
  const lowfreq = movingAverage(samples, longWin);
  return lowpassed.map((v, i) => v - lowfreq[i]);
}

/**
 * Adaptive-threshold peak detection. Sliding WINDOW_SECONDS window,
 * peak = local maximum exceeding mean + THRESHOLD_FRACTION*(max-mean)
 * of the window. Enforces a REFRACTORY_MS minimum gap. Returns sample
 * indices of detected peaks.
 */
export function detectPeaks(samples: number[], sampleRate: number): number[] {
  const n = samples.length;
  const win = Math.round(WINDOW_SECONDS * sampleRate);
  const refractory = Math.round((REFRACTORY_MS / 1000) * sampleRate);
  const peaks: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    const lo = Math.max(0, i - Math.floor(win / 2));
    const hi = Math.min(n - 1, i + Math.floor(win / 2));
    let mean = 0, max = -Infinity;
    for (let j = lo; j <= hi; j++) {
      mean += samples[j];
      if (samples[j] > max) max = samples[j];
    }
    mean /= hi - lo + 1;
    const threshold = mean + THRESHOLD_FRACTION * (max - mean);
    const isLocalMax = samples[i] >= samples[i - 1] && samples[i] > samples[i + 1];
    if (isLocalMax && samples[i] >= threshold) {
      if (peaks.length === 0 || i - peaks[peaks.length - 1] >= refractory) {
        peaks.push(i);
      } else if (samples[i] > samples[peaks[peaks.length - 1]]) {
        // Within refractory: keep the taller peak.
        peaks[peaks.length - 1] = i;
      }
    }
  }
  return peaks;
}

/** Variance of a series. */
function variance(samples: number[]): number {
  if (samples.length === 0) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  return (
    samples.reduce((a, b) => a + (b - mean) * (b - mean), 0) / samples.length
  );
}

/**
 * SNR in dB — ratio of in-band (0.5-3 Hz) energy to out-of-band
 * energy. In-band energy is the variance of the bandpassed signal;
 * out-of-band is the residual.
 */
export function computeSnrDb(samples: number[], sampleRate: number): number {
  const detrended = detrend(samples);
  const inBand = bandpass(detrended, sampleRate);
  const inBandPower = variance(inBand);
  const totalPower = variance(detrended);
  const outOfBandPower = Math.max(totalPower - inBandPower, 1e-9);
  return 10 * Math.log10(Math.max(inBandPower, 1e-12) / outOfBandPower);
}

/**
 * Full pipeline: detrend → bandpass → detectPeaks → R-R intervals.
 * Returns R-R intervals in ms plus the SNR of the input.
 */
export function ppgToRrIntervals(
  samples: number[],
  sampleRate: number,
): { rrIntervals: number[]; snrDb: number } {
  const snrDb = computeSnrDb(samples, sampleRate);
  const detrended = detrend(samples);
  const filtered = bandpass(detrended, sampleRate);
  const peaks = detectPeaks(filtered, sampleRate);
  const rrIntervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    rrIntervals.push(((peaks[i] - peaks[i - 1]) / sampleRate) * 1000);
  }
  return { rrIntervals, snrDb };
}
```

Each function is pure and individually testable. If the Task 6 tests fail against this implementation (e.g., peak count outside 9-11), tune `THRESHOLD_FRACTION` or the moving-average windows — do not weaken the tests.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- ppg`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hrv/ppg.ts src/lib/hrv/ppg.test.ts
git commit -m "feat(hrv): PPG signal processing — detrend, bandpass, peak detection"
```

---

### Task 7: Baseline model — rolling means, SWC, warm-up state, readiness bucket

**Files:**
- Create: `src/lib/hrv/baseline.ts`
- Test: `src/lib/hrv/baseline.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from "vitest";
import {
  rollingMean,
  withinSubjectSd,
  computeSwc,
  warmUpStateForCount,
  classifyReadiness,
  computeBaseline,
} from "./baseline";

describe("warmUpStateForCount", () => {
  it("is discovery below 7 readings", () => {
    expect(warmUpStateForCount(6)).toBe("discovery");
  });
  it("is provisional from 7 to 13 readings", () => {
    expect(warmUpStateForCount(7)).toBe("provisional");
    expect(warmUpStateForCount(13)).toBe("provisional");
  });
  it("is active from 14 readings", () => {
    expect(warmUpStateForCount(14)).toBe("active");
  });
});

describe("rollingMean", () => {
  it("averages the most recent N values", () => {
    expect(rollingMean([1, 2, 3, 4, 5], 3)).toBeCloseTo(4, 5); // (3+4+5)/3
  });
});

describe("computeSwc", () => {
  it("is half the within-subject SD", () => {
    const series = [10, 12, 14, 16, 18];
    expect(computeSwc(series)).toBeCloseTo(withinSubjectSd(series) * 0.5, 5);
  });
});

describe("classifyReadiness", () => {
  // baseline 4.0, swc 0.1 -> normal band [3.9, 4.1]
  it("classifies within ±SWC as normal", () => {
    expect(classifyReadiness(4.05, 4.0, 0.1)).toBe("normal");
  });
  it("classifies between -SWC and -2*SWC as low", () => {
    expect(classifyReadiness(3.85, 4.0, 0.1)).toBe("low");
  });
  it("classifies below -2*SWC as very_low", () => {
    expect(classifyReadiness(3.7, 4.0, 0.1)).toBe("very_low");
  });
  it("classifies above +2*SWC as very_high", () => {
    expect(classifyReadiness(4.3, 4.0, 0.1)).toBe("very_high");
  });
});

describe("computeBaseline", () => {
  it("returns all five keys Task 9 depends on", () => {
    // This assertion is the TDD contract for the submitHrvReading consumer.
    const lnSeries = Array.from({ length: 20 }, () => 4.0);
    const result = computeBaseline(lnSeries);
    expect(result).toHaveProperty("rolling7dMean");
    expect(result).toHaveProperty("baseline60dMean");
    expect(result).toHaveProperty("swc");
    expect(result).toHaveProperty("warmUpState");
    expect(result).toHaveProperty("readinessBucket");
    expect(typeof result.rolling7dMean).toBe("number");
    expect(typeof result.baseline60dMean).toBe("number");
    expect(typeof result.swc).toBe("number");
  });

  it("returns no readiness bucket while in discovery", () => {
    const lnSeries = [4.0, 4.1, 3.9]; // 3 readings
    const result = computeBaseline(lnSeries);
    expect(result.warmUpState).toBe("discovery");
    expect(result.readinessBucket).toBeNull();
  });

  it("returns a readiness bucket once active", () => {
    const lnSeries = Array.from({ length: 20 }, () => 4.0);
    const result = computeBaseline(lnSeries);
    expect(result.warmUpState).toBe("active");
    expect(result.readinessBucket).toBe("normal");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- baseline`
Expected: FAIL — module/exports not defined.

- [ ] **Step 3: Implement `src/lib/hrv/baseline.ts`**

Implement per spec §5. The input series is the member's chronologically-ordered `lnRmssd` values (most recent last), one per valid measured day, sick days already excluded.

- `rollingMean(series, n)` — mean of the most recent `n` values (or all, if fewer).
- `withinSubjectSd(series)` — sample standard deviation.
- `computeSwc(series)` — `0.5 × withinSubjectSd(series)`.
- `warmUpStateForCount(count)` — `<7` discovery, `7-13` provisional, `≥14` active.
- `classifyReadiness(sevenDayMean, baseline, swc)` — 5-bucket thresholds from spec §5.
- `computeBaseline(lnSeries)` — orchestrator returning `{ rolling7dMean, baseline60dMean, swc, warmUpState, readinessBucket }`. `readinessBucket` is `null` unless `warmUpState === 'active'`. The 7-day mean uses the most recent 7 values; the 60-day baseline uses the most recent 60.

Each function pure. Complete implementation, no placeholders.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- baseline`
Expected: PASS — all tests green.

- [ ] **Step 5: Add one real-world signal regression test**

Add a test to `baseline.test.ts` using a ≥20-value real lnRMSSD series (from PhysioNet, the HRV4Training validation set, or P0 spike data). Assert `computeBaseline` returns plausible values (warmUpState active, baseline within the series min/max, swc > 0). Document the data source in a code comment.

- [ ] **Step 6: Run all HRV lib tests + commit**

Run: `npm test -- hrv`
Expected: PASS — rmssd, ppg, baseline all green.

```bash
git add src/lib/hrv/baseline.ts src/lib/hrv/baseline.test.ts
git commit -m "feat(hrv): baseline model — rolling means, SWC, readiness buckets"
```

---

## Chunk 3: Capture & persistence

### Task 8: Mock store for demo mode

**Files:**
- Create: `src/lib/hrv/mock.ts`

**Context:** The app runs in "demo mode" without Supabase (`SUPABASE_ENABLED === false`, see `src/lib/supabase/env.ts`). The HRV module must not crash in that mode. `mock.ts` provides an in-memory reading store.

- [ ] **Step 1: Implement the mock store**

```ts
import type { HrvReading } from "./types";

/**
 * In-memory HRV reading store for demo mode (no Supabase).
 * Resets on every server restart — acceptable for demo/mock use.
 */
const store: HrvReading[] = [];

export function mockInsertReading(reading: HrvReading): void {
  store.push(reading);
}

export function mockListReadings(memberId: string): HrvReading[] {
  return store
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
}

export function mockTodayReading(
  memberId: string,
  isoDate: string,
): HrvReading | null {
  return (
    mockListReadings(memberId).find((r) =>
      r.measuredAt.startsWith(isoDate),
    ) ?? null
  );
}
```

- [ ] **Step 2: Type-check + commit**

Run: `npx tsc --noEmit`
Expected: no errors.

```bash
git add src/lib/hrv/mock.ts
git commit -m "feat(hrv): in-memory mock store for demo mode"
```

---

### Task 9: `submitHrvReading` server action

**Files:**
- Create: `src/app/(app)/hrv/actions.ts`

**Reference:** Follow the dual-mode pattern in `src/app/(app)/actions.ts` — `"use server"`, `SUPABASE_ENABLED` gate, `createClient` from `@/lib/supabase/server`, `revalidatePath`.

- [ ] **Step 1: Implement the action**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { filterEctopic, computeRmssd, computeLnRmssd, computeMeanHr } from "@/lib/hrv/rmssd";
import { computeBaseline } from "@/lib/hrv/baseline";
import { mockInsertReading, mockListReadings } from "@/lib/hrv/mock";
import type { HrvReading, HrvSource } from "@/lib/hrv/types";

const SubmitSchema = z.object({
  rrIntervals: z.array(z.number().positive()).min(2),
  source: z.enum(["camera_ppg", "polar_h10"]),
  snrDb: z.number(),
  timezone: z.string(),
});

export type SubmitHrvResult =
  | { ok: true; reading: HrvReading }
  | { ok: false; error: string };

export async function submitHrvReading(
  input: z.infer<typeof SubmitSchema>,
): Promise<SubmitHrvResult> {
  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const { rrIntervals, source, snrDb, timezone } = parsed.data;

  // --- algorithm core ---
  const { clean, ectopicPct } = filterEctopic(rrIntervals);
  if (ectopicPct > 5) return { ok: false, error: "too_many_ectopic" };
  if (clean.length < 2) return { ok: false, error: "signal_too_short" };

  const rmssdMs = computeRmssd(clean);
  const lnRmssd = computeLnRmssd(rmssdMs);
  const meanHrBpm = computeMeanHr(clean);
  const confidence = source === "polar_h10" ? "high" : snrDb >= 6 ? "high" : "medium";
  const measuredAt = new Date().toISOString();

  // --- demo mode ---
  if (!SUPABASE_ENABLED) {
    const prior = mockListReadings("demo-member").map((r) => r.lnRmssd);
    const base = computeBaseline([...prior, lnRmssd]);
    const reading: HrvReading = {
      id: crypto.randomUUID(),
      memberId: "demo-member",
      measuredAt,
      source,
      confidence,
      rmssdMs,
      lnRmssd,
      meanHrBpm,
      rolling7dMeanLnRmssd: base.rolling7dMean,
      baseline60dMeanLnRmssd: base.baseline60dMean,
      baseline60dSwc: base.swc,
      warmUpState: base.warmUpState,
      readinessBucket: base.readinessBucket,
      timezone,
      isSick: false,
    };
    mockInsertReading(reading);
    revalidatePath("/hrv");
    return { ok: true, reading };
  }

  // --- connected mode ---
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "no_session" };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "no_session" };
  const memberId = auth.user.id;

  const { data: priorRows } = await supabase
    .from("hrv_readings")
    .select("ln_rmssd")
    .eq("member_id", memberId)
    .eq("is_sick", false)
    .order("measured_at", { ascending: true });

  const prior = (priorRows ?? []).map((r) => r.ln_rmssd as number);
  const base = computeBaseline([...prior, lnRmssd]);

  const { data: inserted, error } = await supabase
    .from("hrv_readings")
    .insert({
      member_id: memberId,
      measured_at: measuredAt,
      source,
      confidence,
      quality_warnings: { ectopic_pct: ectopicPct, snr_db: snrDb },
      rr_intervals: clean,
      rmssd_ms: rmssdMs,
      ln_rmssd: lnRmssd,
      mean_hr_bpm: meanHrBpm,
      rolling_7d_mean_lnrmssd: base.rolling7dMean,
      baseline_60d_mean_lnrmssd: base.baseline60dMean,
      baseline_60d_swc: base.swc,
      warm_up_state: base.warmUpState,
      readiness_bucket: base.readinessBucket,
      timezone,
      is_sick: false,
    })
    .select()
    .single();

  if (error || !inserted) return { ok: false, error: "insert_failed" };

  revalidatePath("/hrv");
  revalidatePath("/dashboard");
  return { ok: true, reading: mapRow(inserted) };
}

/** Maps a DB row to the HrvReading domain type. */
function mapRow(row: Record<string, unknown>): HrvReading {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    measuredAt: row.measured_at as string,
    source: row.source as HrvSource,
    confidence: row.confidence as HrvReading["confidence"],
    rmssdMs: row.rmssd_ms as number,
    lnRmssd: row.ln_rmssd as number,
    meanHrBpm: (row.mean_hr_bpm as number) ?? null,
    rolling7dMeanLnRmssd: (row.rolling_7d_mean_lnrmssd as number) ?? null,
    baseline60dMeanLnRmssd: (row.baseline_60d_mean_lnrmssd as number) ?? null,
    baseline60dSwc: (row.baseline_60d_swc as number) ?? null,
    warmUpState: row.warm_up_state as HrvReading["warmUpState"],
    readinessBucket: (row.readiness_bucket as HrvReading["readinessBucket"]) ?? null,
    timezone: row.timezone as string,
    isSick: row.is_sick as boolean,
  };
}
```

**Note:** `computeBaseline` must return `rolling7dMean` and `baseline60dMean` keys — verify Task 7's return shape matches (rename in Task 7 if needed before this task).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/hrv/actions.ts
git commit -m "feat(hrv): submitHrvReading server action"
```

---

### Task 10: `PPGCanvas` capture component

**Files:**
- Create: `src/components/hrv/PPGCanvas.tsx`

- [ ] **Step 1: Implement the component**

A client component (`"use client"`) that:
- On mount, calls `navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: 640, height: 480 } })`.
- Attempts `track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] })` inside a try/catch (fails silently on iOS — that is expected and fine).
- Renders a hidden `<video>` + a `<canvas>`. Every animation frame, draws the video to the canvas and reads mean red-channel intensity of a 100×100 px center ROI.
- Buffers samples for 60 s (extendable to 90 s in 15 s steps), then calls `props.onComplete(samples, sampleRate)`.
- Exposes `props.onProgress(elapsedSeconds)` for the countdown UI.
- Cleans up the camera track on unmount.

Keep the DOM/camera handling here; do NOT compute R-R intervals in this component — that is `ppg.ts`'s job, called by the parent sheet.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, navigate to a scratch page rendering `<PPGCanvas>`, confirm the camera permission prompt appears and `onComplete` fires after 60 s on a desktop webcam (signal quality irrelevant here — we are testing the capture lifecycle).

- [ ] **Step 4: Commit**

```bash
git add src/components/hrv/PPGCanvas.tsx
git commit -m "feat(hrv): PPGCanvas camera capture component"
```

---

### Task 11: `MeasurementSheet` flow

**Files:**
- Create: `src/components/hrv/MeasurementSheet.tsx`

**Reference:** `src/components/ui/FormCheckSheet.tsx` — same `Sheet`/`SheetContent` pattern, same step-machine approach.

- [ ] **Step 1: Implement the sheet**

A client component using `Sheet`/`SheetContent` from `@/components/ui/Sheet`. Step machine: `"intro" → "measuring" → "processing" → "result" | "error"`.

- `intro`: copy + "Mål nu" button.
- `measuring`: renders `<PPGCanvas>` + a 60 s countdown driven by `onProgress`; instructional copy *"Træk vejret som du plejer. Det er ikke en breathing exercise."*
- On `PPGCanvas.onComplete(samples, sampleRate)`: call `ppgToRrIntervals(samples, sampleRate)` from `@/lib/hrv/ppg`. If SNR < 3 dB or fewer than 30 R-R intervals → extend measurement 15 s (max 90 s); if already at 90 s → go to `error` with a retry option.
- `processing`: call `submitHrvReading({ rrIntervals, source: "camera_ppg", snrDb, timezone })`.
- `result`: show the returned `rmssdMs` + a short warm-up-state-aware message (Discovery: "Vi bygger din baseline"; Active: the bucket text).
- `error`: message + "Prøv igen" returning to `intro`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/hrv/MeasurementSheet.tsx
git commit -m "feat(hrv): MeasurementSheet measurement flow"
```

---

## Chunk 4: Page, navigation, cron, settings

### Task 12: `/hrv` page — 3 states

**Files:**
- Create: `src/app/(app)/hrv/page.tsx`

- [ ] **Step 1: Implement the page**

A server component that:
- Resolves the current member (connected mode) or `"demo-member"` (demo mode).
- Loads today's reading: connected mode queries `hrv_readings` for a row whose `measured_at` is today in the member's timezone; demo mode uses `mockTodayReading`.
- Renders one of three states (spec §6):
  - **A — not measured today:** large "*God morgen. 60 sekunder.*" + a client button opening `<MeasurementSheet>`.
  - **B — measured, `warmUpState === 'active'`:** large `rmssdMs` ms value + 7-day mean + bucket text.
  - **C — measured, `warmUpState` discovery/provisional:** value + "*Vi bygger din baseline. N dage tilbage.*" (N = `7 − count` while discovery, else `14 − count`).
- Pull the measurement-trigger button into a small `"use client"` wrapper component if needed (the sheet is client-side; the page stays a server component).

Match the existing monochrome design tokens. No `/hrv/trends`, `/hrv/insights`, `/hrv/learn` in this plan — P2.

- [ ] **Step 2: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, log in (demo invite code), visit `/hrv`. Confirm state A renders, the sheet opens, and after a measurement the page reflects state B/C.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/hrv/page.tsx
git commit -m "feat(hrv): /hrv page — 3 measurement states"
```

---

### Task 13: Register `/hrv` in navigation

**Files:**
- Modify: `src/components/app/AppShell.tsx`
- Modify: `src/components/app/MobileTabBar.tsx`

- [ ] **Step 1: Add `/hrv` to the desktop sidebar**

In `AppShell.tsx`, add to the nav array (renumber `num` values so they stay sequential):
```ts
{ href: "/hrv", label: "HRV", num: "05" },
```
Place it after `/community` (Crew) and before `/reps`. Renumber Reps/Mig/Beskeder accordingly.

- [ ] **Step 2: Add `/hrv` to the mobile tab-bar**

In `MobileTabBar.tsx`, add an `Icon.hrv` SVG glyph (a simple heartbeat/pulse line, monochrome, matching the existing icon style) and a `TABS` entry:
```ts
{ href: "/hrv", label: "HRV", icon: Icon.hrv },
```
Place it after `/community`.

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev`, confirm `/hrv` appears in both the desktop sidebar and the mobile tab-bar, and active-state highlighting works.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/AppShell.tsx src/components/app/MobileTabBar.tsx
git commit -m "feat(hrv): register /hrv in desktop + mobile navigation"
```

---

### Task 14: `vercel.json` + cron handlers (streak-check real, two stubs)

**Files:**
- Create: `vercel.json`
- Create: `src/app/api/cron/hrv-streak-check/route.ts`
- Create: `src/app/api/cron/hrv-alert-detect/route.ts` (stub)
- Create: `src/app/api/cron/hrv-weekly-insights/route.ts` (stub)
- Modify: `.env.example`

**Rationale:** Spec §9/§11 register all 3 crons in `vercel.json` from P1, with stub handlers that still verify `CRON_SECRET` — registering a cron path with no route handler would 404 on every nightly invocation. P1 ships all 3 paths; only `hrv-streak-check` gets non-trivial logic (and even that is a verified stub until P8).

- [ ] **Step 1: Create `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cron/hrv-streak-check",    "schedule": "0 23 * * *" },
    { "path": "/api/cron/hrv-alert-detect",    "schedule": "0 5 * * *" },
    { "path": "/api/cron/hrv-weekly-insights", "schedule": "0 18 * * 0" }
  ]
}
```
Schedules are UTC (spec §9): 23:00 UTC ≈ 00:00 Europe/Copenhagen, 05:00 UTC ≈ 06:00-07:00 local (DST), Sunday 18:00 UTC ≈ 19:00-20:00 local.

- [ ] **Step 2: Add `CRON_SECRET` to `.env.example`**

Append:
```env
## ---------------------------------------------------------------
## 7. Cron jobs (Vercel Cron)
## ---------------------------------------------------------------
## Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` with each
## scheduled invocation. Cron route handlers verify this header.
## Generate a random value and set it in the Vercel project env
## (Preview + Production) and here for local testing.
CRON_SECRET=
```

- [ ] **Step 3: Implement the three cron handlers**

All three share the same `CRON_SECRET` auth gate. `src/app/api/cron/hrv-streak-check/route.ts`:
```ts
import { NextResponse } from "next/server";

/**
 * Nightly HRV measurement-streak check. Phase 1: verifies auth and
 * returns ok. Streak computation + Reps milestone events land in P8.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  // P1: verified stub. Streak logic ships in P8.
  return NextResponse.json({ ok: true, phase: "p1-stub", job: "streak-check" });
}
```

`src/app/api/cron/hrv-alert-detect/route.ts` — identical shape, stub body, `job: "alert-detect"` (real logic ships in P7):
```ts
import { NextResponse } from "next/server";

/** HRV red-flag alert detection. Stub until P7. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  return NextResponse.json({ ok: true, phase: "p1-stub", job: "alert-detect" });
}
```

`src/app/api/cron/hrv-weekly-insights/route.ts` — identical shape, `job: "weekly-insights"` (real logic ships in P4):
```ts
import { NextResponse } from "next/server";

/** Claude weekly-insights generation. Stub until P4. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  return NextResponse.json({ ok: true, phase: "p1-stub", job: "weekly-insights" });
}
```

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev` with `CRON_SECRET=test` in `.env.local`. Test each handler:
```bash
curl -i localhost:3002/api/cron/hrv-streak-check
# Expected: 401 unauthorized
curl -i -H "Authorization: Bearer test" localhost:3002/api/cron/hrv-streak-check
# Expected: 200 {"ok":true,"phase":"p1-stub","job":"streak-check"}
```
Repeat for `hrv-alert-detect` and `hrv-weekly-insights`.

- [ ] **Step 6: Commit**

```bash
git add vercel.json src/app/api/cron/ .env.example
git commit -m "feat(hrv): vercel.json + 3 cron handlers (streak real, 2 stubs)"
```

---

### Task 15: HRV settings section

**Files:**
- Modify: `src/app/(app)/settings/page.tsx` (verify exact path first — it may be a nested route)
- Create: `src/app/(app)/hrv/settings-actions.ts`

- [ ] **Step 1: Locate the settings page**

Run: `ls src/app/\(app\)/settings/` and inspect `page.tsx` to learn the existing settings UI pattern (sections, server actions, dual-mode handling).

- [ ] **Step 2: Implement settings server actions**

Create `src/app/(app)/hrv/settings-actions.ts` with a `"use server"` action `updateHrvSettings` that upserts a `hrv_settings` row (`preferred_source`, `session_suggestion_enabled`, `cycle_tracking_enabled`, `share_to_coach`). Demo mode: no-op returning `{ ok: true }`. Connected mode: `upsert` keyed on `member_id`.

- [ ] **Step 3: Add the HRV settings section to the settings page**

Add a new section to the settings UI, matching the existing section pattern, with controls for: preferred source (camera/Polar), session-suggestion toggle, cycle-tracking toggle, share-to-coach toggle. When cycle-tracking is enabled, show a single "Log menstrual start" date picker that writes a `menstrual_start` event to `hrv_lifestyle_logs` (spec §5 — this is the only lifestyle-log entry point that ships in P1).

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

Run `npm run dev`, open settings, toggle each HRV control, confirm no errors and (connected mode) the `hrv_settings` row updates.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(app\)/settings/ src/app/\(app\)/hrv/settings-actions.ts
git commit -m "feat(hrv): HRV settings section + menstrual-start logging"
```

---

### Task 16: Phase 1 verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: PASS — all rmssd, ppg, baseline tests green.

- [ ] **Step 2: Type-check + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass, production build succeeds.

- [ ] **Step 3: End-to-end manual flow (demo mode)**

Run `npm run dev`, log in with a demo invite code. Verify:
- `/hrv` renders state A.
- Measurement sheet opens, camera flow completes, a reading is produced.
- `/hrv` updates to state C (Discovery — first reading).
- HRV appears in both navs.
- Settings HRV section works.

- [ ] **Step 4: End-to-end manual flow (connected mode, if a Supabase project is available)**

With Supabase env set: apply migration `0031`, repeat the flow, confirm an `hrv_readings` row is written with correct derived columns and RLS allows the member to read only their own row.

- [ ] **Step 5: Final commit**

```bash
git commit --allow-empty -m "chore(hrv): Phase 1 verification complete — measurement core ready for internal pilot"
```

---

## Done — Phase 1 complete

At this point the internal pilot can begin: Munk + 3-5 crew measure daily for ~2 weeks to build real baseline data. Phase 2 (trends visualization, `/hrv/trends`, `/dashboard` chip, `/hrv/learn`) gets its own plan once pilot data exists.

**Not in this plan (later phases):** `/hrv/trends`, `/hrv/insights`, `/hrv/learn`, lifestyle-logging UI beyond menstrual-start, Polar H10 Web Bluetooth, session integration (B-prong), coach red-flag queue, adaptive periodization (D-prong), Claude weekly insights, Reps streak milestones, HealthKit fallback.
