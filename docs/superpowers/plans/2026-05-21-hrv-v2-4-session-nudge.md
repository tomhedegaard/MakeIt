# HRV V2.4 — Session readiness nudge implementation plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a connected member opens `/session/[id]` on a day their HRV is `low` or `very_low`, a passive 2-line banner appears above the first exercise. A member-level toggle in `/settings` silences it (default on).

**Architecture:** Pure-nudge B-prong. A new pure evaluator (`src/lib/hrv/nudge.ts`) decides yes/no/which-bucket from already-fetched rows; a thin I/O wrapper in `src/lib/data/hrv.ts` does the Supabase reads. The session page passes the result as a prop to `SessionClient`, which mounts a new server component above `<ExerciseSection>`. Settings UI mirrors the existing cycle-tracking toggle row in `HrvSettingsSection`. No migration — `hrv_settings.session_suggestion_enabled` already exists with `default true` in `0032_hrv_module.sql:19`. No writes to `hrv_session_modifiers`.

**Tech Stack:** Next.js 16, React 19 (server components), Supabase (postgres + RLS), TypeScript 5, Vitest. No new dependencies.

**Spec:** [`docs/superpowers/specs/2026-05-21-hrv-v2-4-session-nudge-design.md`](../specs/2026-05-21-hrv-v2-4-session-nudge-design.md) (rev 2).

**Depends on (shipped):** HRV W1-V2.3 — wearable connections, `hrv_readings` baseline columns (`warm_up_state`, `readiness_bucket`, `measured_at`), `hrv_settings` table with `session_suggestion_enabled boolean default true`, `getLatestHrvReading` in `src/lib/data/hrv.ts`, `HrvSettingsSection`, `setCycleTracking` server-action template.

---

## File structure

**New files:**

| Path | Responsibility |
|---|---|
| `src/lib/hrv/nudge.ts` | Pure evaluator — `evaluateNudge({...}) → { bucket } \| null`. Owns the 5 trigger-condition logic in one place. Easy-to-test, zero Supabase coupling. |
| `src/lib/hrv/nudge.test.ts` | Unit tests for `evaluateNudge` — 9 fixtures from spec §6. |
| `src/components/hrv/HrvReadinessNudge.tsx` | Server component (~30 lines) — the banner. Renders `null` when `nudge={null}`. Two copy variants by bucket. Link to `/hrv`. |
| `src/components/hrv/HrvReadinessNudge.test.tsx` | Smoke tests via `renderToString` — null case, both bucket variants, `/hrv` href. |

**Modified files:**

| Path | Change |
|---|---|
| `src/lib/data/hrv.ts` | Add `ReadinessNudge` type + `getTodaysReadinessNudge(memberId)` I/O wrapper. Does the 3 Supabase reads (settings, latest reading, active-connection probe), feeds them to `evaluateNudge`. |
| `src/lib/data/settings.ts` | Extend `HrvSettings` with `sessionSuggestionEnabled: boolean`; update `getMemberHrvSettings` to select `session_suggestion_enabled` and map with `?? true`. |
| `src/app/(app)/hrv/connect-actions.ts` | Add `setSessionSuggestionEnabled(enabled: boolean)` — mirrors `setCycleTracking` exactly. |
| `src/components/hrv/HrvSettingsSection.tsx` | Second toggle row inside the existing `<ul>` (line 128) mirroring cycle-tracking pattern. |
| `src/app/(app)/session/[id]/page.tsx` | Call `getTodaysReadinessNudge(member.id)` on the supabase branch; pass `readinessNudge` prop (or `null` on demo branch). |
| `src/app/(app)/session/[id]/SessionClient.tsx` | Accept `readinessNudge?` prop; mount `<HrvReadinessNudge nudge={readinessNudge ?? null} />` just above `<ExerciseSection>` (line 207). |

**No migration, no `database.types.ts` regeneration** — `session_suggestion_enabled` is already in the generated types (column exists since `0032`).

---

## Chunk 1: Pure nudge evaluator

This is a single pure function with 9 fixture tests. Zero I/O. Done first because everything else can stub against it.

### Task 1: Pure `evaluateNudge` + tests

**Files:**
- Create: `src/lib/hrv/nudge.ts`
- Create: `src/lib/hrv/nudge.test.ts`

- [ ] **Step 1:** Write the failing tests first. Create `src/lib/hrv/nudge.test.ts`:

  ```ts
  import { describe, it, expect } from "vitest";
  import { evaluateNudge, type EvaluateNudgeInput } from "./nudge";

  /** Build a fixture input — defaults are the "should nudge" state. */
  function input(over: Partial<EvaluateNudgeInput> = {}): EvaluateNudgeInput {
    return {
      sessionSuggestionEnabled: true,
      hasActiveConnection: true,
      reading: {
        warmUpState: "active",
        readinessBucket: "low",
        measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
      },
      now: new Date("2026-05-21T18:00:00Z"),
      ...over,
    };
  }

  describe("evaluateNudge", () => {
    it("returns { bucket: 'low' } when all conditions hold and bucket is low", () => {
      expect(evaluateNudge(input())).toEqual({ bucket: "low" });
    });

    it("returns { bucket: 'very_low' } when bucket is very_low", () => {
      expect(
        evaluateNudge(
          input({
            reading: {
              warmUpState: "active",
              readinessBucket: "very_low",
              measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
            },
          }),
        ),
      ).toEqual({ bucket: "very_low" });
    });

    it("treats absent settings (null) as enabled (default-on)", () => {
      // Locks in default-on at the evaluator boundary, not just the reader.
      expect(evaluateNudge(input({ sessionSuggestionEnabled: null }))).toEqual({
        bucket: "low",
      });
    });

    it("returns null when the member has silenced the toggle", () => {
      expect(evaluateNudge(input({ sessionSuggestionEnabled: false }))).toBeNull();
    });

    it("returns null when the reading is older than 36 hours", () => {
      expect(
        evaluateNudge(
          input({
            reading: {
              warmUpState: "active",
              readinessBucket: "low",
              measuredAt: new Date("2026-05-19T06:00:00Z").toISOString(),
            },
          }),
        ),
      ).toBeNull();
    });

    it("returns null for normal-readiness days", () => {
      expect(
        evaluateNudge(
          input({
            reading: {
              warmUpState: "active",
              readinessBucket: "normal",
              measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
            },
          }),
        ),
      ).toBeNull();
    });

    it("returns null in warming-up (provisional) state — bucket is null then", () => {
      expect(
        evaluateNudge(
          input({
            reading: {
              warmUpState: "provisional",
              readinessBucket: null,
              measuredAt: new Date("2026-05-21T06:12:00Z").toISOString(),
            },
          }),
        ),
      ).toBeNull();
    });

    it("returns null when no wearable is connected", () => {
      expect(evaluateNudge(input({ hasActiveConnection: false }))).toBeNull();
    });

    it("returns null when there are no readings at all", () => {
      expect(evaluateNudge(input({ reading: null }))).toBeNull();
    });
  });
  ```

- [ ] **Step 2:** Run the tests, verify they fail:

  ```bash
  npx vitest run src/lib/hrv/nudge.test.ts
  ```

  Expected: All 9 fail with `Cannot find module './nudge'` or similar.

- [ ] **Step 3:** Implement the pure evaluator. Create `src/lib/hrv/nudge.ts`:

  ```ts
  /**
   * Pure decision logic for the V2.4 session readiness nudge.
   *
   * The data-layer wrapper (`getTodaysReadinessNudge` in
   * `src/lib/data/hrv.ts`) fetches the three inputs from Supabase and
   * hands them here. Keeping this pure means the 5 trigger conditions
   * (spec §3) live in one well-tested place.
   */

  export type ReadinessBucket =
    | "very_low"
    | "low"
    | "normal"
    | "high"
    | "very_high";

  export type WarmUpState = "discovery" | "provisional" | "active";

  export type EvaluateNudgeInput = {
    /**
     * `hrv_settings.session_suggestion_enabled` for the member.
     * `null` means "no row exists" — default-on per the column DDL.
     */
    sessionSuggestionEnabled: boolean | null;
    /**
     * True iff the member has at least one `hrv_wearable_connections`
     * row with `status = 'active'`.
     */
    hasActiveConnection: boolean;
    /**
     * The member's most recent `hrv_readings` row, or `null` if they
     * have none.
     */
    reading: {
      warmUpState: WarmUpState;
      readinessBucket: ReadinessBucket | null;
      measuredAt: string; // ISO timestamp
    } | null;
    /** Injected so tests can pin the clock. */
    now: Date;
  };

  export type NudgeResult = { bucket: "low" | "very_low" } | null;

  const MAX_READING_AGE_MS = 36 * 60 * 60 * 1000; // 36 hours — spec §3 cond. 4

  export function evaluateNudge(input: EvaluateNudgeInput): NudgeResult {
    // Condition 5 — member-level opt-out. Null = default-on.
    if (input.sessionSuggestionEnabled === false) return null;

    // Condition 1 — active wearable connection.
    if (!input.hasActiveConnection) return null;

    // No reading at all → no nudge.
    if (!input.reading) return null;

    // Condition 2 — warm-up state is active (baseline is real).
    if (input.reading.warmUpState !== "active") return null;

    // Condition 3 — readiness bucket is low or very_low.
    const bucket = input.reading.readinessBucket;
    if (bucket !== "low" && bucket !== "very_low") return null;

    // Condition 4 — reading is at most 36h old.
    const ageMs = input.now.getTime() - new Date(input.reading.measuredAt).getTime();
    if (ageMs > MAX_READING_AGE_MS) return null;
    if (ageMs < 0) return null; // pin future timestamps to "no nudge"

    return { bucket };
  }
  ```

- [ ] **Step 4:** Run the tests, verify they pass:

  ```bash
  npx vitest run src/lib/hrv/nudge.test.ts
  ```

  Expected: 9 passed.

- [ ] **Step 5:** Commit.

  ```bash
  git add src/lib/hrv/nudge.ts src/lib/hrv/nudge.test.ts
  git commit -m "feat(hrv): nudge evaluator — 5-condition pure decision logic

  V2.4 B-prong (pure). Owns the trigger logic for the session readiness
  banner in one well-tested place — 9 fixtures cover all combinations
  of the spec §3 conditions.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Chunk 2: Data path & settings

Three small modifications to existing files. After this chunk, the data side is fully wired but no UI shows yet.

### Task 2: Extend `HrvSettings` type + reader

**Files:**
- Modify: `src/lib/data/settings.ts` (HrvSettings type ~lines 67-77 + `getMemberHrvSettings` ~lines 80-115)

- [ ] **Step 1:** Add `sessionSuggestionEnabled: boolean` to the `HrvSettings` type:

  ```ts
  export type HrvSettings = {
    connections: HrvConnection[];
    cycleTrackingEnabled: boolean;
    sessionSuggestionEnabled: boolean;
  };
  ```

- [ ] **Step 2:** Update the demo-mode fallback in `getMemberHrvSettings`:

  ```ts
  if (!supabase)
    return {
      connections: [],
      cycleTrackingEnabled: false,
      sessionSuggestionEnabled: true,
    };
  ```

  Demo defaults to `true` so the toggle UI renders in the on state — matches the column default.

- [ ] **Step 3:** Extend the `hrv_settings` SELECT:

  ```ts
  supabase
    .from("hrv_settings")
    .select("cycle_tracking_enabled, session_suggestion_enabled")
    .eq("member_id", memberId)
    .maybeSingle(),
  ```

- [ ] **Step 4:** Map the new field with default-on for missing rows:

  ```ts
  return {
    connections,
    cycleTrackingEnabled: !!settingsRow?.cycle_tracking_enabled,
    sessionSuggestionEnabled: settingsRow?.session_suggestion_enabled ?? true,
  };
  ```

  Note `??` (not `!!`) so an absent `settingsRow` falls through to `true`, but an explicit `false` from the DB is honoured.

- [ ] **Step 5:** Typecheck:

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors. (If callers of `HrvSettings` exist that destructure the type without spreading, the compiler will flag them — none should, since the type is consumed by component props.)

- [ ] **Step 6:** Commit.

  ```bash
  git add src/lib/data/settings.ts
  git commit -m "feat(hrv): extend HrvSettings with sessionSuggestionEnabled

  Default-on (?? true) so members without an hrv_settings row see the
  nudge once a wearable is connected. Honours an explicit false from
  the DB.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 3: `getTodaysReadinessNudge` I/O wrapper

**Files:**
- Modify: `src/lib/data/hrv.ts` (add after `getLatestHrvReading`, ~after line 124)

- [ ] **Step 1:** Add the type alias + import the evaluator. At the top of `src/lib/data/hrv.ts`, add:

  ```ts
  import { evaluateNudge, type NudgeResult } from "@/lib/hrv/nudge";
  ```

  And re-export the result type so callers don't need to know it lives in `lib/hrv`:

  ```ts
  export type ReadinessNudge = Exclude<NudgeResult, null>;
  ```

- [ ] **Step 2:** Add the I/O wrapper at the bottom of the existing HRV reads section (before `getTodayLifestyleLogs` is fine, or right after `getLatestHrvReading` — pick wherever keeps the file readable):

  ```ts
  /**
   * Returns a nudge spec for today if the member should see the V2.4
   * session readiness banner, otherwise null. Encapsulates spec §3's
   * 5 trigger conditions via the pure `evaluateNudge` helper.
   *
   * Demo / no-supabase → null.
   */
  export async function getTodaysReadinessNudge(
    memberId: string,
  ): Promise<ReadinessNudge | null> {
    const supabase = await createClient();
    if (!supabase) return null;

    // Three reads. Run in parallel — they are independent.
    const [
      { data: settingsRow },
      latestReading,
      { count: activeConnCount },
    ] = await Promise.all([
      supabase
        .from("hrv_settings")
        .select("session_suggestion_enabled")
        .eq("member_id", memberId)
        .maybeSingle(),
      getLatestHrvReading(memberId),
      supabase
        .from("hrv_wearable_connections")
        .select("id", { head: true, count: "exact" })
        .eq("member_id", memberId)
        .eq("status", "active"),
    ]);

    return evaluateNudge({
      sessionSuggestionEnabled:
        (settingsRow?.session_suggestion_enabled as boolean | undefined) ?? null,
      hasActiveConnection: (activeConnCount ?? 0) > 0,
      reading: latestReading
        ? {
            warmUpState: latestReading.warmUpState,
            readinessBucket: latestReading.readinessBucket,
            measuredAt: latestReading.measuredAt,
          }
        : null,
      now: new Date(),
    });
  }
  ```

  Note: `?? null` (not `?? true`) for the settings field — the evaluator distinguishes "null = default-on" from "false = silenced". Passing `?? true` here would lose that distinction (no actual bug, but the test fixture for "no row" verifies the boundary).

- [ ] **Step 3:** Typecheck:

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 4:** Sanity-run the existing test suite to make sure imports resolve:

  ```bash
  npx vitest run src/lib/hrv/
  ```

  Expected: all existing tests pass (no new tests yet for this wrapper — it's I/O glue covered by the evaluator's unit tests).

- [ ] **Step 5:** Commit.

  ```bash
  git add src/lib/data/hrv.ts
  git commit -m "feat(hrv): getTodaysReadinessNudge I/O wrapper

  Three parallel Supabase reads (settings, latest reading, active-
  connection probe) feed the pure evaluateNudge. Demo mode returns
  null. The wrapper preserves the null-vs-false distinction so the
  default-on semantics live in one place.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 4: `setSessionSuggestionEnabled` server action

**Files:**
- Modify: `src/app/(app)/hrv/connect-actions.ts` (add at end of file, after `setCycleTracking`)

- [ ] **Step 1:** Append the new server action. Mirrors `setCycleTracking` exactly — only column name and revalidate path differ:

  ```ts
  /**
   * Enables or disables the V2.4 session readiness nudge for the
   * current member, upserting their `hrv_settings` row.
   */
  export async function setSessionSuggestionEnabled(
    enabled: boolean,
  ): Promise<ActionResult> {
    if (!SUPABASE_ENABLED) return { ok: true };

    const memberId = await getCurrentMemberId();
    if (!memberId) return { ok: false, error: "no_session" };

    const service = createServiceClient();
    const { error } = await service
      .from("hrv_settings")
      .upsert(
        { member_id: memberId, session_suggestion_enabled: enabled },
        { onConflict: "member_id" },
      );

    if (error) return { ok: false, error: "update_failed" };

    revalidatePath("/settings");
    return { ok: true };
  }
  ```

  No `revalidatePath('/session/...')` — the toggle takes effect on next session open by design (spec §11). Avoiding a sweeping revalidate keeps the action cheap and the behaviour predictable.

- [ ] **Step 2:** Typecheck:

  ```bash
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 3:** Commit.

  ```bash
  git add 'src/app/(app)/hrv/connect-actions.ts'
  git commit -m "feat(hrv): setSessionSuggestionEnabled server action

  Mirrors setCycleTracking. Upserts hrv_settings row via service
  client. Demo mode is a no-op. Revalidates /settings only — the
  banner takes effect on next session open by design.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Chunk 3: UI integration

The component, its render tests, the session-page wiring, and the settings toggle row. After this chunk the feature is fully usable.

### Task 5: `HrvReadinessNudge` component + render tests

**Files:**
- Create: `src/components/hrv/HrvReadinessNudge.tsx`
- Create: `src/components/hrv/HrvReadinessNudge.test.tsx`

- [ ] **Step 1:** Write the failing tests. Create `src/components/hrv/HrvReadinessNudge.test.tsx`:

  ```tsx
  import { describe, it, expect } from "vitest";
  import { renderToString } from "react-dom/server";
  import HrvReadinessNudge from "./HrvReadinessNudge";

  describe("HrvReadinessNudge", () => {
    it("renders nothing when nudge is null", () => {
      const html = renderToString(<HrvReadinessNudge nudge={null} />);
      expect(html).toBe("");
    });

    it("shows the low-readiness eyebrow for bucket=low", () => {
      const html = renderToString(
        <HrvReadinessNudge nudge={{ bucket: "low" }} />,
      );
      expect(html).toContain("HRV LAV I DAG");
      expect(html).not.toContain("MEGET LAV");
    });

    it("shows the very-low eyebrow for bucket=very_low", () => {
      const html = renderToString(
        <HrvReadinessNudge nudge={{ bucket: "very_low" }} />,
      );
      expect(html).toContain("HRV MEGET LAV I DAG");
    });

    it("links to /hrv (regression guard if the route moves)", () => {
      const html = renderToString(
        <HrvReadinessNudge nudge={{ bucket: "low" }} />,
      );
      expect(html).toContain('href="/hrv"');
    });
  });
  ```

- [ ] **Step 2:** Run the tests, verify they fail:

  ```bash
  npx vitest run src/components/hrv/HrvReadinessNudge.test.tsx
  ```

  Expected: All 4 fail with `Cannot find module './HrvReadinessNudge'` or similar.

- [ ] **Step 3:** Implement the component. Create `src/components/hrv/HrvReadinessNudge.tsx`:

  ```tsx
  import Link from "next/link";

  type Props = {
    nudge: { bucket: "low" | "very_low" } | null;
  };

  /**
   * V2.4 session readiness banner. Renders above the first exercise
   * on /session/[id] when the member's latest HRV reading is low or
   * very_low and all other trigger conditions hold (see spec §3 and
   * the `evaluateNudge` helper). Renders nothing for null so callers
   * can include it unconditionally.
   */
  export default function HrvReadinessNudge({ nudge }: Props) {
    if (!nudge) return null;

    const isVeryLow = nudge.bucket === "very_low";
    const eyebrow = isVeryLow ? "HRV MEGET LAV I DAG" : "HRV LAV I DAG";
    const body = isVeryLow
      ? "Din readiness er klart under dit normalområde. Gå let i dag eller spring sessionen helt over."
      : "Din readiness er under dit normalområde. Overvej at gå let — drop top-sættene eller stop tidligt hvis kroppen siger fra.";

    return (
      <section
        aria-labelledby="hrv-nudge-heading"
        className="surface-2 rounded-2xl p-5 lg:p-6 space-y-3"
      >
        <h2
          id="hrv-nudge-heading"
          className="eyebrow"
        >
          {eyebrow}
        </h2>
        <p className="text-sm leading-relaxed text-fg-dim">
          {body}
        </p>
        <Link
          href="/hrv"
          className="inline-block text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim lift touch-app"
        >
          Se HRV →
        </Link>
      </section>
    );
  }
  ```

- [ ] **Step 4:** Run the tests, verify they pass:

  ```bash
  npx vitest run src/components/hrv/HrvReadinessNudge.test.tsx
  ```

  Expected: 4 passed.

- [ ] **Step 5:** Commit.

  ```bash
  git add src/components/hrv/HrvReadinessNudge.tsx src/components/hrv/HrvReadinessNudge.test.tsx
  git commit -m "feat(hrv): HrvReadinessNudge banner component

  Two copy variants (low / very_low), monochrome, mirrors the
  surface-2 + eyebrow pattern from HrvSettingsSection. Renders null
  for null so callers include it unconditionally. /hrv link asserted
  in tests so a route move triggers a failure.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 6: Wire the banner into the session page

**Files:**
- Modify: `src/app/(app)/session/[id]/page.tsx` (the whole file, ~40 lines)
- Modify: `src/app/(app)/session/[id]/SessionClient.tsx` (props at line 63; render at line 207)

- [ ] **Step 1:** Update `page.tsx` to fetch the nudge on the supabase branch and pass it through:

  ```tsx
  import { TODAY_SESSION } from "@/lib/workout";
  import { notFound } from "next/navigation";
  import SessionClient from "./SessionClient";
  import { SUPABASE_ENABLED } from "@/lib/supabase/env";
  import { getFullSession } from "@/lib/data/session";
  import { getSession } from "@/lib/auth";
  import {
    FORM_CHECK_LIMIT,
    type FormCheckQuota,
  } from "@/lib/data/form-check-quota";
  import { getFormCheckQuota } from "@/lib/data/form-check-quota-server";
  import { getTodaysReadinessNudge } from "@/lib/data/hrv";

  export default async function SessionPage({
    params,
  }: {
    params: Promise<{ id: string }>;
  }) {
    const { id } = await params;

    if (SUPABASE_ENABLED) {
      const member = await getSession();
      if (!member) notFound();
      const [session, quota, readinessNudge] = await Promise.all([
        getFullSession(id, member.id),
        getFormCheckQuota(member.id, member.tier),
        getTodaysReadinessNudge(member.id),
      ]);
      if (!session) notFound();
      return (
        <SessionClient
          session={session}
          formCheckQuota={quota}
          readinessNudge={readinessNudge}
        />
      );
    }

    // Demo mode — only the static TODAY_SESSION resolves
    const session = id === TODAY_SESSION.id ? TODAY_SESSION : null;
    if (!session) notFound();
    const quota: FormCheckQuota = {
      used: 0,
      limit: FORM_CHECK_LIMIT.Legend,
      remaining: FORM_CHECK_LIMIT.Legend,
      resetsAt: new Date().toISOString(),
      hasRemaining: true,
    };
    return (
      <SessionClient
        session={session}
        formCheckQuota={quota}
        readinessNudge={null}
      />
    );
  }
  ```

  Note: the three reads (`getFullSession`, `getFormCheckQuota`, `getTodaysReadinessNudge`) are independent — wrap in `Promise.all` so the nudge query does not serialise extra round-trip latency onto session-open.

- [ ] **Step 2:** Open `src/app/(app)/session/[id]/SessionClient.tsx`. Add the import at the top:

  ```tsx
  import HrvReadinessNudge from "@/components/hrv/HrvReadinessNudge";
  ```

  Add the prop type to the `SessionClient` component signature (around line 63 — the `export default function SessionClient({ ... })`):

  ```tsx
  export default function SessionClient({
    session,
    formCheckQuota,
    readinessNudge = null,
  }: {
    session: FullSession;
    formCheckQuota: FormCheckQuota;
    readinessNudge?: { bucket: "low" | "very_low" } | null;
  }) {
  ```

  (Keep the existing prop names and types — adapt to whatever they already are. The default of `null` keeps backward compatibility if anything else mounts this component.)

- [ ] **Step 3:** Mount the banner. Locate the existing `<ExerciseSection>` mount inside the main `<Container size="narrow">` (around line 207). Insert the banner immediately above it:

  ```tsx
  <Container size="narrow" className="flex-1 py-6 pb-32 lg:pb-12 space-y-6">
    {/* HRV readiness nudge (V2.4) — renders null when conditions don't hold */}
    <HrvReadinessNudge nudge={readinessNudge} />

    {/* Exercise card */}
    <ExerciseSection
      ex={ex}
      exIdx={exIdx}
      setIdx={setIdx}
      totalExercises={session.exercises.length}
      onOpenFormCheck={() => setFormCheckOpen(true)}
    />
    ...
  </Container>
  ```

  The parent `<Container>` already has `space-y-6`, so the banner gets the same vertical rhythm as everything else for free.

- [ ] **Step 4:** Typecheck + lint:

  ```bash
  npx tsc --noEmit && npx next lint
  ```

  Expected: no errors. If lint complains about the unused-when-null import, it is wrong — the component is referenced unconditionally.

- [ ] **Step 5:** Manual smoke (no automated integration test for this wiring — pure JSX glue):

  Start the dev server and load `/session/<any-id>`. The page renders identically when there is no nudge. (No HRV data needed to verify the no-nudge path — `getTodaysReadinessNudge` returns `null` and `<HrvReadinessNudge nudge={null}>` returns `null`.)

  Optional dogfood-only: in the Supabase dashboard, manually insert a recent `hrv_readings` row with `warm_up_state='active'`, `readiness_bucket='low'`, and `measured_at=now()` for your member, then reload `/session/[id]` — the banner appears above the first exercise.

- [ ] **Step 6:** Commit.

  ```bash
  git add 'src/app/(app)/session/[id]/page.tsx' 'src/app/(app)/session/[id]/SessionClient.tsx'
  git commit -m "feat(hrv): mount readiness nudge above first exercise on /session

  page.tsx fetches the nudge in the supabase branch (parallel with
  session + quota reads). SessionClient accepts an optional
  readinessNudge prop with default null for back-compat, and the
  banner mounts inside the existing space-y-6 container.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

### Task 7: Settings UI — second toggle row

**Files:**
- Modify: `src/components/hrv/HrvSettingsSection.tsx`

- [ ] **Step 1:** Import the new action at the top:

  ```tsx
  import {
    setPrimaryConnection,
    setCycleTracking,
    setSessionSuggestionEnabled,
  } from "@/app/(app)/hrv/connect-actions";
  ```

- [ ] **Step 2:** Add a second `useState` + `useTransition` pair mirroring the cycle-tracking pattern (~line 41-43, right after the cycle-tracking state):

  ```tsx
  /* Session suggestion toggle */
  const [nudgeEnabled, setNudgeEnabled] = useState(hrv.sessionSuggestionEnabled);
  const [nudgePending, startNudge] = useTransition();
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);
  ```

- [ ] **Step 3:** Add a `toggleNudge` handler mirroring `toggleCycle` exactly (right after `toggleCycle`):

  ```tsx
  function toggleNudge(next: boolean) {
    const prev = nudgeEnabled;
    setNudgeEnabled(next);
    setNudgeMsg(null);
    startNudge(async () => {
      const res = await setSessionSuggestionEnabled(next);
      if (res.ok) {
        setNudgeMsg("✓ Gemt");
        window.setTimeout(() => setNudgeMsg(null), 2200);
      } else {
        setNudgeEnabled(prev);
        setNudgeMsg("Kunne ikke gemme — prøv igen.");
      }
    });
  }
  ```

- [ ] **Step 4:** Add a second `<li>` row inside the existing `<ul className="divide-y hairline border-t hairline">` (line 128), right after the cycle-tracking `<li>` (~line 161, before the closing `</ul>`):

  ```tsx
  <li className="py-3 flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0">
      <div className="text-sm">Vis HRV-nudge på workouts</div>
      <div className="text-xs text-fg-dim mt-0.5">
        Når din readiness er lav i dag, ser du en kort note øverst på dagens
        session. Slå fra, hvis du hellere vil have ro.
      </div>
    </div>
    <label className="shrink-0 cursor-pointer touch-app">
      <input
        type="checkbox"
        checked={nudgeEnabled}
        onChange={(e) => toggleNudge(e.target.checked)}
        disabled={nudgePending}
        className="sr-only peer"
      />
      <span
        aria-hidden
        className="block relative w-12 h-7 rounded-full border hairline-strong transition-colors peer-checked:bg-fg peer-checked:border-fg"
        style={{ background: nudgeEnabled ? "var(--fg)" : "var(--bg-3)" }}
      >
        <span
          className="absolute top-0.5 left-0.5 size-6 rounded-full transition-transform"
          style={{
            background: nudgeEnabled ? "var(--bg)" : "var(--fg-dim)",
            transform: nudgeEnabled
              ? "translateX(20px)"
              : "translateX(0)",
          }}
        />
      </span>
    </label>
  </li>
  ```

- [ ] **Step 5:** Add a second feedback message line right after the existing `cycleMsg` block:

  ```tsx
  {nudgeMsg ? (
    <span
      className="text-[10px] font-mono uppercase tracking-[0.16em]"
      style={{ color: nudgeMsg.startsWith("✓") ? "var(--fg)" : "var(--fg-dim)" }}
    >
      {nudgeMsg}
    </span>
  ) : null}
  ```

- [ ] **Step 6:** Typecheck + lint:

  ```bash
  npx tsc --noEmit && npx next lint
  ```

  Expected: no errors. `hrv.sessionSuggestionEnabled` now resolves on the `HrvSettings` type (added in Task 2).

- [ ] **Step 7:** Manual smoke. Load `/settings` in dev — the new toggle row appears below cycle-tracking, defaults to on, flipping it shows ✓ Gemt then fades. Refresh: state persists.

- [ ] **Step 8:** Commit.

  ```bash
  git add src/components/hrv/HrvSettingsSection.tsx
  git commit -m "feat(hrv): settings toggle — Vis HRV-nudge på workouts

  Mirrors the cycle-tracking row exactly: optimistic update with
  rollback on action failure, ✓ Gemt feedback with auto-fade. Calls
  the new setSessionSuggestionEnabled server action.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

---

## Chunk 4: Verification

Final sanity sweep and shipping commit.

### Task 8: Full suite + build + verification commit

**Files:** None — verification only.

- [ ] **Step 1:** Run the full unit-test suite:

  ```bash
  npx vitest run
  ```

  Expected: all green, including the 9 new evaluator tests and the 4 new component tests.

- [ ] **Step 2:** Typecheck + lint:

  ```bash
  npx tsc --noEmit && npx next lint
  ```

  Expected: no errors.

- [ ] **Step 3:** Production build:

  ```bash
  npm run build
  ```

  Expected: build succeeds. The `/session/[id]` route still builds as dynamic (it always was — it reads cookies via Supabase). No new dynamic routes introduced.

- [ ] **Step 4:** Dogfood checklist (manual, optional but recommended before deploy):

  - [ ] `/settings` — new toggle row visible below cycle-tracking, default on, persists across refresh.
  - [ ] `/session/[id]` with no recent HRV reading — page renders identically to before, no banner.
  - [ ] `/session/[id]` with a `low`-bucket reading from today (via dashboard SQL: `select id, warm_up_state, readiness_bucket, measured_at from hrv_readings where member_id = '<you>' order by measured_at desc limit 1`) — banner appears above first exercise, copy says "HRV LAV I DAG".
  - [ ] Toggle off in `/settings`, navigate back to `/session/[id]` — banner gone.
  - [ ] Tap "Se HRV →" — lands on `/hrv`; browser back returns to the session with logged sets intact (client-side state preserved).

- [ ] **Step 5:** Verification commit (matches the chore-verification pattern from earlier HRV phases — `b7d6062`, `2efcac5`, `3162190`):

  ```bash
  git commit --allow-empty -m "chore(hrv): V2.4 verification — session readiness nudge complete

  Plan: docs/superpowers/plans/2026-05-21-hrv-v2-4-session-nudge.md
  Spec: docs/superpowers/specs/2026-05-21-hrv-v2-4-session-nudge-design.md

  Verified:
  - 9 evaluator unit tests pass (all 5 trigger conditions covered)
  - 4 component render tests pass (null case, both buckets, /hrv href)
  - tsc + lint + build clean
  - Manual dogfood: toggle visible & persisting; banner appears for
    low/very_low buckets and is silenced by the toggle.

  Closes V2.4 — B-prong slot in the HRV roadmap.

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  ```

- [ ] **Step 6:** Push the branch (deployment happens automatically via the existing Vercel git integration — same flow as every prior HRV phase):

  ```bash
  git push origin claude/makeit-online-platform-XF2UE
  ```

---

## Risk & rollback

- **Scope of change is small** — one new pure helper, one new component, two existing files extended, two existing files lightly modified, one new server action. No migration. No background work, no cron, no Claude call.
- **Banner is opt-out, not opt-in** — a member who finds it intrusive can silence it from settings without leaving the wearable section. The toggle persists.
- **Rollback** — if the banner causes any unexpected behaviour, revert the merge commit (or the Task 6 commit specifically — removing the `<HrvReadinessNudge>` mount and the `getTodaysReadinessNudge` call from `page.tsx` is sufficient to hide it). The data-layer additions and the settings toggle can stay live; they have no side effects.
- **Demo mode** — explicitly returns `null` everywhere. The `/session/[id]` demo path passes `readinessNudge={null}` and the component renders nothing.
- **No new RLS surface** — reads use the existing `members_own_settings` and `members_own_readings` policies; writes use the service client through the existing `setCycleTracking` pattern.
