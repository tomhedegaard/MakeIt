# HRV Module — V2.2: Claude Weekly Insights

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every Sunday evening, each member with ≥14 days of HRV data gets a short Danish observation about their week plus honest lifestyle-correlation cards (alcohol, sleep), surfaced on a new `/hrv/insights` page.

**Architecture:** A **pure** correlation engine (`src/lib/hrv/insights.ts`) computes the cards and a deterministic template summary — no LLM in the math, so it is fully testable and never hallucinates a number. A thin Claude layer (`src/lib/hrv/insights-claude.ts`, mirroring the shipped `src/lib/data/program-generator-claude.ts`) turns the pre-computed figures into ~150 Danish words; it returns `null` on any failure so the template summary takes over. The existing Sunday cron stub (`/api/cron/hrv-weekly-insights`, already scheduled in `vercel.json`) is replaced with the real job: iterate primary connections, build each member's `InsightData`, generate prose, upsert `hrv_weekly_insights`. The `/hrv/insights` page reads the latest row.

**Tech Stack:** Next.js 16.2.4, React 19, Supabase, `@anthropic-ai/sdk` ^0.95.0 (already a dependency, Sonnet 4.6), Zod 4, TypeScript 5, Vitest. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-15-hrv-module-design.md`](../specs/2026-05-15-hrv-module-design.md) rev 4.2 — §6 (`/hrv/insights` = weekly observation + per-factor correlation cards, `n` always shown), §8 (Claude weekly insights: Sunday cron, Sonnet 4.6 cached system prompt, ~150-word Danish, Zod-validated, template fallback, ~0.4¢/member/week), §9 (`hrv_weekly_insights` schema), §10 (guardrails — never fake precision).

**Depends on (shipped):** the W1–W3 + V1.x + V2.1 HRV module — `/hrv` pages, `HrvSubNav`, `hrv_readings` / `hrv_lifestyle_logs` / `hrv_weekly_insights` tables, `src/lib/data/hrv.ts`, `src/lib/hrv/baseline.ts`, `src/lib/hrv/lifestyle.ts`, `src/lib/supabase/service.ts`, `src/lib/data/program-generator-claude.ts` (the Claude-call pattern this plan copies).

## Existing `hrv_weekly_insights` (migration 0031 — verified, NO migration needed)

```
id uuid pk · member_id uuid → members · week_start date not null
summary_text text not null · correlation_cards jsonb not null
claude_model_id text not null · tokens_used int · generated_at timestamptz
unique (member_id, week_start)
```
RLS: `members_own_weekly_insights` (`for select using member_id = auth.uid()`) + `coach_reads_opted_weekly_insights` (coach reads only when the member's `hrv_settings.share_to_coach = true`). The `unique (member_id, week_start)` constraint already exists, so the cron's weekly upsert is idempotent with **no new migration**. The cron writes via the **service-role client** (`createServiceClient()`), which bypasses RLS — background work members cannot do themselves.

## Design decisions (locked — do not deviate without surfacing)

1. **Correlations are math, not LLM judgement.** `src/lib/hrv/insights.ts` computes `correlationCards` and `weekStats` deterministically. Claude only writes prose *about* those figures and is instructed never to invent numbers. This mirrors `program-generator-claude.ts`: deterministic core, LLM as an optional enhancement, rule-based fallback always present.

2. **Honest, explicit-log-only correlation.** A lifestyle log only exists for days the member actively logged. Absence of an `alcohol_drinks` log does **not** mean "0 drinks" — so the engine compares **only explicitly-logged days**. Each card needs `n ≥ 4` in *both* groups or its `status` is `"insufficient_data"` ("Ikke nok data endnu"). This respects spec §10 (refuse to fake precision) and §6 ("`n` always shown").

3. **Per-factor pairing offset.** Alcohol consumed on day D affects the *next* morning's reading → alcohol log date D pairs with the HRV reading dated **D+1**. Sleep logged for day D describes the night into D's morning → sleep log date D pairs with the reading dated **D**. The offset is a per-factor constant. Same-calendar-date matching uses the server-date `YYYY-MM-DD` slice (consistent with V2.1's server-date model; timezone refinement is later polish).

4. **Two factors in V2.2: `alcohol` and `sleep`.** These are the lifestyle logs with logged numeric values suitable for a two-group comparison. The spec's §6 also names "training" — that needs a join against the `sessions` table and is **deferred** (D-prong / a later phase). The engine's card list is built from a factor-config array so adding `feeling`/training later is a one-entry change.

5. **Geometric mean for RMSSD.** Groups are averaged in ln-space (`mean(lnRmssd)`), then back-transformed (`Math.exp(...)`) to ms — the standard for HRV. `deltaPct = round((exposed − baseline) / baseline × 100)`.

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `src/lib/hrv/insights.ts` | Pure engine — `weekStartFor`, `buildInsightData` (week stats + correlation cards), `buildTemplateSummary`. No IO, no LLM. |
| `src/lib/hrv/insights.test.ts` | Unit tests for the engine. |
| `src/lib/hrv/insights-claude.ts` | `"server-only"` Claude prose layer — `generateInsightSummary`, returns `null` on any failure. |
| `src/components/hrv/InsightCard.tsx` | Renders one correlation card (monochrome, `n` always shown). |
| `src/app/(app)/hrv/insights/page.tsx` | The `/hrv/insights` route — latest weekly insight or empty state. |

**Modified files:**

| Path | Change |
|---|---|
| `src/app/api/cron/hrv-weekly-insights/route.ts` | Replace the stub with the real job. |
| `src/lib/data/hrv.ts` | Add `getLatestWeeklyInsight(memberId)`. |
| `src/components/hrv/HrvSubNav.tsx` | Add the `/hrv/insights` ("Indsigt") link. |

**No migration, no `database.types.ts` regeneration** — `hrv_weekly_insights` already exists in the shipped `0031_hrv_module.sql` and is already in `database.types.ts`.

---

## Chunk 1: Pure correlation engine

### Task 1: The insights engine (pure, TDD)

**Files:**
- Create: `src/lib/hrv/insights.ts`
- Test: `src/lib/hrv/insights.test.ts`

The engine's public surface:

```ts
/** A lifestyle factor V2.2 correlates against HRV. */
export type InsightFactor = "alcohol" | "sleep";

/** One correlation card — a two-group RMSSD comparison for a factor. */
export interface CorrelationCard {
  factor: InsightFactor;
  status: "ok" | "insufficient_data";
  exposedN: number;          // days in the "exposed" group (e.g. drank, slept short)
  baselineN: number;         // days in the "baseline" group
  exposedMeanRmssd: number | null;   // ms, geometric mean — null when insufficient
  baselineMeanRmssd: number | null;
  deltaPct: number | null;   // round((exposed - baseline) / baseline * 100)
}

/** Week-over-week summary figures. */
export interface WeekStats {
  weekMeanRmssd: number | null;       // ms, geometric mean, current week
  priorWeekMeanRmssd: number | null;  // ms, the 7 days before week_start
  weekReadingCount: number;           // readings inside the current week
}

/** A reading reduced to what the engine needs. */
export interface InsightReading {
  date: string;     // "YYYY-MM-DD" (server-date slice of measured_at)
  lnRmssd: number;
}

/** A lifestyle log reduced to what the engine needs. */
export interface InsightLog {
  date: string;     // "YYYY-MM-DD" (logged_for_date)
  eventType: string;
  value: unknown;   // the jsonb value blob
}

export interface InsightInput {
  readings: InsightReading[];
  lifestyleLogs: InsightLog[];
  weekStart: string;   // "YYYY-MM-DD", a Monday
}

export interface InsightData {
  weekStart: string;
  weekStats: WeekStats;
  correlationCards: CorrelationCard[];
}
```

- [ ] **Step 1: Write failing tests** in `src/lib/hrv/insights.test.ts` covering:

  **`weekStartFor(date: Date): string`** — returns the Monday of that date's week as `YYYY-MM-DD` (UTC). ISO convention: Sunday is the *last* day of its week, not the first.
  - A Sunday (`2026-05-17`) → `"2026-05-11"` (the Monday 6 days earlier — the week Mon May 11 → Sun May 17).
  - A Monday (`2026-05-11`) → `"2026-05-11"` (itself).
  - A Wednesday (`2026-05-13`) → `"2026-05-11"`.

  > **Cron semantics (intentional):** the Sunday-evening cron (`0 18 * * 0`) calls `weekStartFor(now)`, which returns the Monday of the *just-completed* week containing that Sunday. `buildInsightData`'s current-week window `[weekStart, weekStart+7)` then spans exactly that Mon–Sun. Do **not** flip the offset to "next Monday" — the job summarizes the week that just ended.

  **`buildInsightData(input: InsightInput): InsightData`**
  - **Week stats:** given readings spanning `weekStart`'s week and the prior week, `weekMeanRmssd` is the geometric mean (`exp(mean(lnRmssd))`, rounded) of readings dated `[weekStart, weekStart+7)`; `priorWeekMeanRmssd` covers `[weekStart-7, weekStart)`; `weekReadingCount` counts the current week. A week with no readings → `weekMeanRmssd: null`, `weekReadingCount: 0`.
  - **Week-stats boundary case:** a reading dated exactly `weekStart+7` must NOT count toward the current week (upper bound exclusive); a reading dated exactly `weekStart-7` MUST count toward the prior week (lower bound inclusive); a reading dated exactly `weekStart` counts toward the current week. Assert all three with explicit dated readings so an off-by-one in the comparison is caught.
  - **Alcohol card — `ok`:** with ≥4 days logging `alcohol_drinks` `{count:0}` (baseline) and ≥4 days logging `{count:2}` or `{count:3}` (exposed), and HRV readings on each paired **next** day (`logDate + 1`), the card has `status:"ok"`, correct `exposedN`/`baselineN`, geometric-mean RMSSD for each group, and `deltaPct = round((exposed-baseline)/baseline*100)`. Days logging `{count:1}` are excluded from both groups (ambiguous middle).
  - **Alcohol card — `insufficient_data`:** with only 2 exposed days, `status:"insufficient_data"`, `exposedMeanRmssd:null`, `baselineMeanRmssd:null`, `deltaPct:null`, but `exposedN`/`baselineN` still report the real (small) counts.
  - **Sleep card:** `sleep_hours` logs paired with the **same**-day reading (`logDate + 0`); exposed = `hours < 7`, baseline = `hours >= 7`; ≥4 each → `status:"ok"` with the delta; otherwise `insufficient_data`.
  - **A log with no paired reading is dropped** (e.g. an alcohol log on the last day with no D+1 reading contributes to neither group).
  - **Card order is stable:** `correlationCards` is always `[alcohol, sleep]` regardless of input order.

  **`buildTemplateSummary(data: InsightData): string`** — a deterministic Danish fallback.
  - Returns a non-empty string mentioning the week's mean RMSSD when `weekMeanRmssd` is non-null.
  - For each `ok` card, the string references the factor and its `deltaPct`.
  - With no data at all (null stats, all cards `insufficient_data`) it still returns a safe, non-empty Danish sentence (no `NaN`, no `undefined`, no `null` in the text).

- [ ] **Step 2: Run — expect FAIL.** `npm test -- insights` → fails (`insights.ts` not found).

- [ ] **Step 3: Implement `src/lib/hrv/insights.ts`.** Pure, no IO, no imports beyond `./lifestyle` types if useful. Key implementation notes:
  - `weekStartFor`: compute UTC day-of-week, subtract `(dow + 6) % 7` days, return `.toISOString().slice(0,10)`.
  - Geometric mean helper: `geoMeanRmssd(lnValues: number[]): number | null` → `null` for an empty array, else `Math.round(Math.exp(sum/len))`. Use this **one** helper for both `weekMeanRmssd`/`priorWeekMeanRmssd` and the card group means — never re-derive the rounding inline.
  - The `value` blob is always a validated object (`validateLifestyleValue` in `lifestyle.ts` guarantees shape on write), so the `classify` casts need no null-guard. Optionally import `AlcoholDrinksValue` / `SleepHoursValue` from `./lifestyle` for the casts instead of inline `{count?:number}` literals.
  - Build a `Map<string, number>` of `date → lnRmssd` from `readings` for O(1) pairing (if a date has multiple readings, last wins — readings are few per day).
  - A factor-config array drives the cards:
    ```ts
    const FACTOR_CONFIG = [
      { factor: "alcohol", eventType: "alcohol_drinks", pairOffsetDays: 1,
        classify: (v) => { const c = (v as {count?:number}).count;
          return c === 0 ? "baseline" : (c === 2 || c === 3) ? "exposed" : "skip"; } },
      { factor: "sleep", eventType: "sleep_hours", pairOffsetDays: 0,
        classify: (v) => { const h = (v as {hours?:number}).hours;
          return typeof h !== "number" ? "skip" : h < 7 ? "exposed" : "baseline"; } },
    ] as const;
    ```
    For each config: filter logs to its `eventType`, classify each, look up the reading at `date + pairOffsetDays`, collect `lnRmssd` into the exposed/baseline arrays. `MIN_GROUP_N = 4`. Build the card; `status:"ok"` only when both arrays have `≥ MIN_GROUP_N`.
  - `addDays(dateStr, n)`: parse `YYYY-MM-DD` as UTC, add `n*86400000`, re-slice.
  - `buildTemplateSummary`: assemble 2–3 plain Danish sentences from the figures; guard every interpolation against `null`.

- [ ] **Step 4: Run — expect PASS.** `npm test -- insights` → all green. `npx tsc --noEmit` clean.

- [ ] **Step 5: Commit.**
  ```bash
  git add src/lib/hrv/insights.ts src/lib/hrv/insights.test.ts
  git commit -m "feat(hrv): weekly-insights correlation engine + template summary"
  ```

---

## Chunk 2: Claude prose layer + cron job

### Task 2: Claude prose layer

**Files:**
- Create: `src/lib/hrv/insights-claude.ts`

Mirror `src/lib/data/program-generator-claude.ts` **exactly** for the SDK usage. The verified pattern in that file (and the other three `*-claude.ts` files in the repo) is: `client.messages.parse({ ..., output_config: { format: zodOutputFormat(Schema) } })` then read `response.parsed_output`. There is **no `submit_*` tool and no `tool_choice`** — structured output comes from `output_config.format`. `zodOutputFormat` (from `@anthropic-ai/sdk/helpers/zod`) takes exactly **one** argument (the Zod schema).

- [ ] **Step 1: Implement `insights-claude.ts`:**
  - `import "server-only";` at the top. `import Anthropic from "@anthropic-ai/sdk";`, `import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";`, `import { z } from "zod";`, `import type { InsightData } from "./insights";`.
  - `export const INSIGHT_MODEL_ID = "claude-sonnet-4-6";`
  - Output schema: `const ObservationSchema = z.object({ observation: z.string().min(40).max(900) });` and `type ObservationOutput = z.infer<typeof ObservationSchema>;`
  - A frozen `SYSTEM_PROMPT` constant (Danish), instructing: you are MakeIt // HQ's HRV-coach voice; write **one** observation of ~150 words in Danish, second person ("du"); you receive pre-computed figures and **must never invent or alter a number** — reference only the figures given; no medical claims, no diagnosis; if a correlation card is `insufficient_data`, do not pretend a pattern exists; calm, honest, non-alarmist tone (spec §10).
  - `export interface InsightSummaryResult { summaryText: string; modelId: string; tokensUsed: number; }`
  - `export async function generateInsightSummary(data: InsightData): Promise<InsightSummaryResult | null>`:
    - `const apiKey = process.env.ANTHROPIC_API_KEY; if (!apiKey) return null;`
    - `const client = new Anthropic({ apiKey });`
    - Build a compact, deterministic user payload: `const userPayload = JSON.stringify(data, null, 2);` (the system prompt explains the `InsightData` shape — week stats + each card's factor/status/n/means/delta).
    - Inside a `try`:
      ```ts
      const response = await client.messages.parse({
        model: INSIGHT_MODEL_ID,
        max_tokens: 600,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        messages: [
          { role: "user", content: [
            { type: "text", text:
              "Skriv ugens observation ud fra disse beregnede tal:\n\n" + userPayload },
          ] },
        ],
        output_config: { format: zodOutputFormat(ObservationSchema) },
      });
      const out: ObservationOutput | null = response.parsed_output;
      if (!out) return null;
      return {
        summaryText: out.observation,
        modelId: INSIGHT_MODEL_ID,
        tokensUsed:
          (response.usage.input_tokens ?? 0) + (response.usage.output_tokens ?? 0),
      };
      ```
      (`Usage.input_tokens` is typed `number | null` in this SDK — the `?? 0` is required.)
    - `catch (err)`: log (`Anthropic.APIError` branch like `program-generator-claude.ts`, else generic `console.warn`) and `return null`. **Never throw** — the cron's template fallback depends on `null`.

- [ ] **Step 2:** `npx tsc --noEmit` clean. (No unit test — this is a thin IO wrapper over the SDK, exercised by the cron's manual smoke in Task 4. Match the precedent: `program-generator-claude.ts` has no unit test.)

- [ ] **Step 3: Commit.**
  ```bash
  git add src/lib/hrv/insights-claude.ts
  git commit -m "feat(hrv): Claude prose layer for weekly insights"
  ```

### Task 3: Weekly-insights cron job

**Files:**
- Modify: `src/app/api/cron/hrv-weekly-insights/route.ts` (replace the stub body)

- [ ] **Step 1: Replace the stub.** Keep the bearer-secret check; add `export const runtime = "nodejs";` and keep `export const dynamic = "force-dynamic";`. The job:
  1. Verify `Bearer ${process.env.CRON_SECRET}` — unchanged from the stub; `401` on mismatch.
  2. `const supabase = createServiceClient();` (from `@/lib/supabase/service`).
  3. `const now = new Date(); const weekStart = weekStartFor(now);` — the current week's Monday (`from @/lib/hrv/insights`).
  4. Load every **primary** connection: `hrv_wearable_connections` `select("id, member_id")` `.eq("is_primary", true)`. On query error → `500`.
  5. `WINDOW_DAYS = 56`; `windowCutoff = new Date(now - 56d).toISOString()`.
  6. For each connection, inside its own `try/catch` (one failure must not abort the batch):
     - Load readings: `hrv_readings` `select("measured_at, ln_rmssd")` `.eq("connection_id", conn.id)` `.gte("measured_at", windowCutoff)` `.order("measured_at", { ascending: true })`.
     - Map to `InsightReading[]`: `{ date: r.measured_at.slice(0,10), lnRmssd: r.ln_rmssd }`.
     - **Gate:** count distinct `date` values; if `< 14` → `skipped += 1; continue` (spec §8 — insights need ≥14 days of data).
     - Load lifestyle logs: `hrv_lifestyle_logs` `select("logged_for_date, event_type, value")` `.eq("member_id", conn.member_id)` `.gte("logged_for_date", windowCutoff.slice(0,10))`. Map to `InsightLog[]`. (Readings filter by `connection_id` — they belong to the primary connection per spec §5 — but lifestyle logs are member-scoped, not connection-scoped, so they filter by `member_id`. This asymmetry is intentional; do not "fix" it.)
     - `const data = buildInsightData({ readings, lifestyleLogs, weekStart });`
     - `const claude = await generateInsightSummary(data);`
     - `const summaryText = claude?.summaryText ?? buildTemplateSummary(data);`
     - `const claudeModelId = claude?.modelId ?? "template-fallback";`
     - `const tokensUsed = claude?.tokensUsed ?? null;`
     - **Upsert** `hrv_weekly_insights`:
       ```ts
       await supabase.from("hrv_weekly_insights").upsert(
         { member_id: conn.member_id, week_start: weekStart,
           summary_text: summaryText, correlation_cards: data.correlationCards,
           claude_model_id: claudeModelId, tokens_used: tokensUsed,
           generated_at: now.toISOString() },
         { onConflict: "member_id,week_start" },
       );
       ```
       (`correlation_cards` is a `jsonb` column — pass the array directly, supabase-js serialises it.) Throw on the upsert error so the `catch` logs it.
     - Increment `insights`; increment `claudeUsed` or `templateUsed` accordingly.
  7. Return `NextResponse.json({ ok: true, connections: rows.length, insights, skipped, claudeUsed, templateUsed })`.
  - Match the `console.error` prefix style of `hrv-wearable-sync` (`[cron/hrv-weekly-insights] ...`).

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` clean.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/app/api/cron/hrv-weekly-insights/route.ts
  git commit -m "feat(hrv): weekly-insights cron — generate + upsert per member"
  ```

---

## Chunk 3: `/hrv/insights` page

### Task 4: Data read

**Files:**
- Modify: `src/lib/data/hrv.ts`

- [ ] **Step 1:** Add a `WeeklyInsight` type and `getLatestWeeklyInsight` to `src/lib/data/hrv.ts`:
  ```ts
  import type { CorrelationCard } from "@/lib/hrv/insights";

  export interface WeeklyInsight {
    weekStart: string;
    summaryText: string;
    correlationCards: CorrelationCard[];
    claudeModelId: string;
    generatedAt: string;
  }
  ```
  `export async function getLatestWeeklyInsight(memberId: string): Promise<WeeklyInsight | null>`:
  - `const supabase = await createClient(); if (!supabase) return null;` (demo mode → `null`).
  - Query `hrv_weekly_insights` `select("week_start, summary_text, correlation_cards, claude_model_id, generated_at")` `.eq("member_id", memberId)` `.order("week_start", { ascending: false })` `.limit(1)` `.maybeSingle()`.
  - `if (!row) return null;`
  - Map to `WeeklyInsight`; cast `row.correlation_cards` to `CorrelationCard[]` (it is `jsonb` → typed `unknown`/`Json`; an `as` cast is fine — the cron is the only writer and writes the engine's exact shape).

- [ ] **Step 2:** `npx tsc --noEmit` clean.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/lib/data/hrv.ts
  git commit -m "feat(hrv): getLatestWeeklyInsight data read"
  ```

### Task 5: `InsightCard` component

**Files:**
- Create: `src/components/hrv/InsightCard.tsx`

- [ ] **Step 1: Implement** a server component (no `"use client"` needed — purely presentational) `InsightCard`. Props: `card: CorrelationCard`. Read `src/components/hrv/ConnectionStatus.tsx` and `src/components/hrv/ReadinessLadder.tsx` first for the monochrome design tokens (`text-fg`, `text-fg-dim`, `text-fg-faint`, `hairline` borders, `font-mono` eyebrows — **no colour accents**).
  - Danish factor labels: `alcohol → "Alkohol"`, `sleep → "Søvn"`.
  - `status === "insufficient_data"`: show the factor label + "Ikke nok data endnu" + the honest counts, e.g. `"4 dage logget — brug for mindst 4 i hver gruppe"` using `exposedN`/`baselineN`. **`n` is always shown.**
  - `status === "ok"`: show the factor label, the two group means (`exposedMeanRmssd` / `baselineMeanRmssd` ms), the `deltaPct` (with explicit sign, e.g. `−12%` / `+5%`), and **both `n` values**. Danish framing per factor — alcohol: `"Dage med alkohol vs. uden"`; sleep: `"Nætter under 7 t vs. 7 t+"`. A delta is a description, never advice (spec §10).

- [ ] **Step 2:** `npx tsc --noEmit && npm run lint` clean.

- [ ] **Step 3: Commit.**
  ```bash
  git add src/components/hrv/InsightCard.tsx
  git commit -m "feat(hrv): InsightCard correlation-card component"
  ```

### Task 6: The `/hrv/insights` page + sub-nav link

**Files:**
- Create: `src/app/(app)/hrv/insights/page.tsx`
- Modify: `src/components/hrv/HrvSubNav.tsx`

- [ ] **Step 1: Add the sub-nav link.** In `src/components/hrv/HrvSubNav.tsx`, add `{ href: "/hrv/insights", label: "Indsigt" }` to the `LINKS` array (after `/hrv/trends`, before `/hrv/learn`). The existing `pathname?.startsWith(link.href)` active-match logic already handles a new entry; update the doc-comment's "three `/hrv` pages" wording to "four".

- [ ] **Step 2: Implement the page** `src/app/(app)/hrv/insights/page.tsx` — a server component, mirroring the scaffold of `src/app/(app)/hrv/trends/page.tsx` (`Container`, `PageHeader`, `HrvSubNav`, `getSession`, `redirect("/login")`):
  - `const member = await getSession(); if (!member) redirect("/login");`
  - `const insight = await getLatestWeeklyInsight(member.id);`
  - `<PageHeader eyebrow="HRV" title="Indsigt" subtitle="Din ugentlige observation og hvad din livsstil ser ud til at betyde." />` then `<HrvSubNav />` inside a `Container`.
  - **Empty state** (`insight === null` — covers demo mode and members with no insight row yet): editorial copy — "Din første ugentlige indsigt skrives søndag aften, så snart du har 14 dages data fra dit wearable." Calm, no CTA pressure.
  - **Populated state:** render `insight.summaryText` as the lead paragraph (narrow text column), then the `insight.correlationCards` as a list/grid of `<InsightCard card={...} />`, then a faint provenance line — `insight.claudeModelId === "template-fallback"` → "Skrevet automatisk." else "Skrevet af MakeIt-coachen." plus the week label `insight.weekStart` (camelCase — the `WeeklyInsight` field from Task 4). Match a sibling page's `Container` spacing (`trends/page.tsx` uses `py-8 lg:py-12 space-y-8`). Do not regress the existing `HrvSubNav` or sibling `/hrv` pages.

- [ ] **Step 3:** `npx tsc --noEmit && npm run lint` clean. Manual smoke: `npm run dev`, visit `/hrv/insights` — the empty state renders (no insight rows locally yet), `HrvSubNav` shows the new "Indsigt" tab and highlights it on that route.

- [ ] **Step 4: Commit.**
  ```bash
  git add "src/app/(app)/hrv/insights/page.tsx" src/components/hrv/HrvSubNav.tsx
  git commit -m "feat(hrv): /hrv/insights page + sub-nav link"
  ```

### Task 7: V2.2 verification

- [ ] **Step 1:** `npm test` — all green, including the new `insights` tests.
- [ ] **Step 2:** `npx tsc --noEmit && npm run build` — both pass. `npm run lint` — no **new** errors in V2.2 files (`insights.ts`, `insights-claude.ts`, `insights.test.ts`, `InsightCard.tsx`, `insights/page.tsx`, `hrv-weekly-insights/route.ts`, the `hrv.ts` / `HrvSubNav.tsx` edits). Pre-existing lint errors in unrelated non-HRV files (`coach/system/*`, `PhaseAnimator.tsx`, `LogWeightCard.tsx`, `PlanGenerationOverlay.tsx`, `exercises.ts`, `SessionClient.tsx`) are out of scope — do not fix or regress them.
- [ ] **Step 3: Cron smoke (local).** With the local Supabase stack running and `CRON_SECRET` set, `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3002/api/cron/hrv-weekly-insights` returns `{ ok: true, ... }`. With no member having ≥14 days of local data, expect `insights: 0` and a non-zero `skipped` — that is correct. If a dogfood member *does* have ≥14 days, confirm one `hrv_weekly_insights` row appears (`docker exec ... psql`) and that re-running the curl **updates** that row (not duplicates — `unique (member_id, week_start)`). If `ANTHROPIC_API_KEY` is unset locally, expect `templateUsed` to carry the count and `claude_model_id = "template-fallback"` — that is the intended fallback, not a failure.
- [ ] **Step 4: Final commit.**
  ```bash
  git commit --allow-empty -m "chore(hrv): V2.2 verification — Claude weekly insights complete"
  ```

---

## Done — V2.2 complete

Members with ≥14 days of HRV data receive a Sunday-evening Danish observation plus honest alcohol/sleep correlation cards on `/hrv/insights`; the prose is Claude-written with a deterministic template fallback, and every figure shown is computed, not generated.

**Next:** V2.3 (coach red-flag queue) — the `/api/cron/hrv-alert-detect` cron + `/coach/queue` HRV section; it reads the `sick`/`feeling` lifestyle tags and RHR/RMSSD trends for its alert conditions (spec §8).

**Not in V2.2:** the "training" correlation factor (needs a `sessions` join — deferred), the coach queue, session/periodization integration (V2.3–V2.5). Timezone-correct day boundaries (V2.2 uses server-date slices) and richer factors (`feeling`, late meals) are noted for later polish.
