# HRV V2.4 — Session readiness nudge (B-prong, pure)

**Date:** 2026-05-21 · **Spec revision:** 1
**Status:** Approved (design)
**Phase:** V2.4 — closes the B-prong slot in the HRV roadmap
**Module path:** integrates into `/session/[id]` and `/settings`

> Roadmap context: [`2026-05-15-hrv-module-design.md`](./2026-05-15-hrv-module-design.md) §7 (B-prong) and §11 (phasing). The original B-prong design proposed a `DeloadSuggestionSheet` with accept/decline + actual mutation of `session_sets`. This phase ships a **lighter** variant: a passive readiness banner with no sheet, no mutation, no `hrv_session_modifiers` rows. The heavier sheet variant is explicitly *not* on the roadmap any longer — see §11.

---

## 0. References to existing codebase (verified)

| Artifact | Path | Status |
|---|---|---|
| HRV data layer | `src/lib/data/hrv.ts` — `getLatestHrvReading(memberId)` | Shipped — returns `warmUpState` + `readinessBucket` |
| HRV settings type | `src/lib/data/settings.ts` — `HrvSettings` (`{ connections, cycleTrackingEnabled }`) | Shipped — **needs new field `sessionSuggestionEnabled`** |
| HRV settings reader | `src/lib/data/settings.ts` — `getMemberHrvSettings(memberId)` | Shipped — needs to select the new column |
| Settings actions | `src/app/(app)/hrv/connect-actions.ts` — `setCycleTracking(next: boolean)` | Shipped — template for new `setSessionSuggestionEnabled` action |
| Settings UI section | `src/components/hrv/HrvSettingsSection.tsx` | Shipped — adds a second toggle row mirroring cycle-tracking |
| Session page | `src/app/(app)/session/[id]/page.tsx` — server component, gates on `SUPABASE_ENABLED` | Shipped — adds one new server-side prop on the supabase branch |
| Session client | `src/app/(app)/session/[id]/SessionClient.tsx` — line 207 mounts `<ExerciseSection>` inside the `Container` | Shipped — banner mounts just above `<ExerciseSection>` |
| `hrv_settings.session_suggestion_enabled` | `supabase/migrations/0032_hrv_module.sql:19` (`boolean default true`) | Shipped — column already exists with the right default |
| RLS `members_own_settings` | `supabase/migrations/0032_hrv_module.sql:136` (`for all using (member_id = auth.uid())`) | Shipped — covers writes from the new server action |

**No new migration.** The schema for this phase is already on production.

---

## 1. Overview & positioning

When a connected member opens a workout on a day where their HRV is meaningfully below their personal baseline, they should *know it* — without the app deciding for them what to do about it. V2.4 ships exactly that signal as a short banner above the first exercise on `/session/[id]`, plus a settings toggle to silence it.

**Brand positioning.** Honest, low-friction, no intervention. The banner names the signal and links to `/hrv` for context; it does not mutate planned sets, push a deload sheet, or persist any choice. Members keep full agency. Coaches keep their existing pause-from-alert path (the C-prong, already shipped) for cases where intervention is warranted.

This explicitly *retires* the heavier `DeloadSuggestionSheet`/`hrv_session_modifiers` B-prong design from the original roadmap. The reasoning: a soft sheet that mutates the planned weights is high-friction and high-risk (members training above their head if they later regret accepting; data quality questions if logged weights diverge from planned), and the strength-training evidence base for HRV-guided autoregulation is weak (`§7` design-spec). Pure information is a cheaper, safer experiment.

## 2. Goals & non-goals

### Goals
- Show a 2-line passive banner on `/session/[id]` when the member's most recent HRV reading is `low` or `very_low` and the warm-up state is `active`.
- Respect a member-level opt-out (`hrv_settings.session_suggestion_enabled`, default `true`).
- Ship a settings toggle that mirrors the existing cycle-tracking toggle pattern, so members can silence the banner without leaving the wearable section.
- Never block, never gate, never mutate the workout.

### Non-goals (V2.4)
- No `DeloadSuggestionSheet` modal.
- No mutation of `session_sets.target_weight` / `target_reps` / `target_rpe`.
- No writes to `hrv_session_modifiers`. The table stays as-is and continues to serve only the C-prong (coach pause-from-alert, already shipped).
- No accept/decline buttons; no per-session dismiss; no per-day "remind me later".
- No impressions logging. If a later phase wants to evaluate effect, it can post-hoc join `hrv_readings.measured_at` against `sessions.completed_at` and inspect logged top-set weight on `low`/`very_low` days vs others.
- No coach-facing surface for banner views. Coaches already see HRV trends and the alert queue.
- No copy variation by exercise type, day of week, or program phase.

### Out of scope (other V2 sub-phases, not V2.4)
- V2.5 — Reps milestones (90-day unbroken sync, first-connection bonus, insights-reviewed counter).
- V2.6 — D-prong adaptive periodization (Claude program generator reads 28-day HRV trend, inserts deload weeks).
- W4 — Native iOS HealthKit companion.

## 3. Trigger conditions

The banner is rendered **iff all five** of the following hold:

1. Member has at least one row in `hrv_wearable_connections` with `status = 'active'`.
2. Member's most recent `hrv_readings` row has `warm_up_state = 'active'` (member has ≥14 days of synced readings on their current primary connection).
3. That same row has `readiness_bucket in ('low', 'very_low')`.
4. That same row's `measured_at` is from today or yesterday (`measured_at >= now() - interval '36 hours'`). Older readings are silently ignored — we never push stale data into a workout.
5. `hrv_settings.session_suggestion_enabled = true` (default `true`; absence of a row also counts as `true` since `default` applies on insert).

If any condition fails: render nothing. No empty state, no warming-up message, no "connect your wearable" prompt on the session page (the `/hrv` page already owns those states).

**Demo mode (`!SUPABASE_ENABLED`).** Banner is never shown. The mock store does not produce HRV readings; gating in `page.tsx` skips the read entirely.

## 4. Data path

### New function in `src/lib/data/hrv.ts`

```ts
export type ReadinessNudge = { bucket: 'low' | 'very_low' };

/**
 * Returns a nudge spec for today if the member should see the session
 * readiness banner; otherwise null. Encapsulates all 5 trigger
 * conditions (§3). Demo / no-supabase → null.
 */
export async function getTodaysReadinessNudge(
  memberId: string,
): Promise<ReadinessNudge | null>;
```

Internally:
1. Read `hrv_settings.session_suggestion_enabled` for `memberId`. If `false` → return `null`.
2. Read the latest `hrv_readings` row (`getLatestHrvReading` is reusable — already selects `warm_up_state`, `readiness_bucket`, `measured_at`).
3. Verify there is at least one `hrv_wearable_connections` row with `status='active'` for the member. Cheap: `head: true, count: 'exact'` on a `status='active'` filter.
4. Apply trigger conditions §3 (2)-(4). If all pass → `{ bucket: row.readinessBucket as 'low' | 'very_low' }`; otherwise `null`.

This function does one extra round-trip vs `getLatestHrvReading`. That's acceptable on the session-detail server render (single page hit per workout start, not a hot path).

### Wired into `src/app/(app)/session/[id]/page.tsx`

On the `SUPABASE_ENABLED` branch, after `getFullSession` / `getFormCheckQuota`:

```ts
const nudge = await getTodaysReadinessNudge(member.id); // null when conditions fail
return <SessionClient session={session} formCheckQuota={quota} readinessNudge={nudge} />;
```

Demo branch passes `readinessNudge={null}` explicitly.

### Extension to `HrvSettings` type + reader

`src/lib/data/settings.ts`:

```ts
export type HrvSettings = {
  connections: WearableConnection[];
  cycleTrackingEnabled: boolean;
  sessionSuggestionEnabled: boolean; // NEW — defaults to true if no row exists
};
```

`getMemberHrvSettings` adds `session_suggestion_enabled` to its `.select(...)` and maps it: `sessionSuggestionEnabled: settingsRow?.session_suggestion_enabled ?? true`. Default-on so any member without a `hrv_settings` row sees the banner once a wearable is connected.

### New server action in `src/app/(app)/hrv/connect-actions.ts`

```ts
'use server';
export async function setSessionSuggestionEnabled(
  next: boolean,
): Promise<{ ok: boolean }>;
```

Mirrors `setCycleTracking` exactly: upserts the `hrv_settings` row keyed on `member_id`, writes `session_suggestion_enabled = next`, calls `revalidatePath('/settings')`, returns `{ ok: boolean }`. Demo mode → `{ ok: true }` (no-op). RLS is already satisfied by `members_own_settings`.

## 5. UI

### New component `src/components/hrv/HrvReadinessNudge.tsx`

Server component, monochrome, dansk, matcher de eksisterende HRV-cards. Renders nothing when given `nudge={null}` — caller may always include it unconditionally.

```tsx
type Props = { nudge: { bucket: 'low' | 'very_low' } | null };

export default function HrvReadinessNudge({ nudge }: Props) {
  if (!nudge) return null;
  // ... eyebrow + 2-line body + "Se HRV →" link
}
```

**Layout (visual, monochrome, no icons):**

```
┌─────────────────────────────────────────────┐
│  HRV LAV I DAG                              │  ← eyebrow
│                                             │
│  Din readiness er under dit normalområde.   │
│  Overvej at gå let — drop top-sættene       │
│  eller stop tidligt hvis kroppen siger fra. │
│                                             │
│  SE HRV →                                   │  ← link, mono caps
└─────────────────────────────────────────────┘
```

**Copy by bucket** (Danish — matches Munks tone, instruktivt fordi medlem allerede er inde i en træning og skal kunne handle på linjen uden at navigere væk):

- `low` — eyebrow: **"HRV LAV I DAG"** — body: *"Din readiness er under dit normalområde. Overvej at gå let — drop top-sættene eller stop tidligt hvis kroppen siger fra."*
- `very_low` — eyebrow: **"HRV MEGET LAV I DAG"** — body: *"Din readiness er klart under dit normalområde. Gå let i dag eller spring sessionen helt over."*

**Styling.** Reuse the `surface-2 rounded-2xl` + `eyebrow` + `text-sm leading-relaxed text-fg-dim` pattern from `HrvSettingsSection` and `LifestyleLogCard`. No icons, no color accents — the banner inherits the existing monochrome tokens.

**Link.** `<Link href="/hrv">` — opens in the same tab. Lets a member look at trend / lifestyle context without losing the session (Next.js back navigation preserves session state since `SessionClient` is a client component with local React state).

**Accessibility.** The eyebrow is a heading (`<h2 className="eyebrow">`); the body is a paragraph; the link has a discernible label. No live region (the banner is server-rendered, not announced mid-session). Touch target ≥44×44px on the link.

### Placement in `SessionClient.tsx`

The banner mounts inside the existing main `<Container size="narrow">` (line 205), positioned **just before** `<ExerciseSection>` at line 207. This puts it:

- Below the sticky session header (which carries the progress bar).
- Above the first exercise card.
- Inside the scroll container — it scrolls away with the workout, so it does not occupy permanent vertical real estate.

`SessionClient` takes a new optional prop `readinessNudge?: { bucket: 'low' | 'very_low' } | null` and renders `<HrvReadinessNudge nudge={readinessNudge ?? null} />` at that position. When `nudge` is null, the component returns `null` and no DOM is emitted — no reserved height.

### Settings UI extension

`src/components/hrv/HrvSettingsSection.tsx` accepts the existing `hrv` prop which now carries `sessionSuggestionEnabled`. A second toggle row is added inside the existing `<ul className="divide-y hairline border-t hairline">` block (line 128), mirroring the cycle-tracking toggle pattern exactly:

- Label: **"Vis HRV-nudge på workouts"**
- Description: *"Når din readiness er lav i dag, ser du en kort note øverst på dagens session. Slå fra, hvis du hellere vil have ro."*
- Default-on (matches the column default).
- Calls `setSessionSuggestionEnabled` server action with optimistic state + rollback on failure (copy & shape from the cycle-tracking toggle: same `useTransition`, same `setMsg('✓ Gemt')` flicker, same rollback prev on `!ok`).

The toggle's state lives next to `cycleEnabled` in the same `useState` pair-pattern. No additional islands or providers.

## 6. Testing

### Unit (Vitest)

`src/lib/data/hrv.test.ts` (extend the existing file — or add `nudge.test.ts` if it grows beyond one suite). Test `getTodaysReadinessNudge` against fixture readings:

- `active` + `low` + today + connection-active + setting-true → `{ bucket: 'low' }`
- `active` + `very_low` + today + connection-active + setting-true → `{ bucket: 'very_low' }`
- `active` + `low` + today + connection-active + **no `hrv_settings` row at all** → `{ bucket: 'low' }` (locks in default-on at the data-fn boundary, not just the reader)
- `active` + `low` + today + setting-false → `null`
- `active` + `low` + 48h ago (stale) → `null`
- `active` + `normal` + today → `null`
- `provisional` + `low` + today → `null` (readiness_bucket is null when not active)
- no active connection → `null`
- no readings at all → `null`

Mocks the Supabase client the same way `insights.test.ts` already does.

### Component (smoke)

A trivial render-test for `HrvReadinessNudge`: renders nothing for `null`; renders the right eyebrow for each bucket; the "Se HRV →" link's `href` equals `/hrv` (locks in the route so a future move triggers a test failure rather than a silent regression). No visual-regression apparatus.

### Manual

After deploy, dogfood path: connect WHOOP (allerede gjort), confirm banner appears on the next morning sync that lands in `low`/`very_low`. Confirm settings toggle silences it. Confirm normal-readiness days show no banner. Confirm `/hrv` link returns to session via browser-back without losing logged sets.

## 7. Migrations

**None.** `hrv_settings.session_suggestion_enabled` already exists in `0032_hrv_module.sql:19` with `default true`. RLS on `hrv_settings` is already permissive for member self-writes. `database.types.ts` already knows the column.

No regeneration of `database.types.ts` needed.

## 8. Guardrails — what we refuse to do (V2.4-specific)

Carried forward from the master spec §10 and made operational here:

- **No daily readiness from a single day's value.** The banner uses `readiness_bucket`, which already encodes the Plews 7d-mean-vs-60d-baseline framework — never the day's raw lnRMSSD.
- **No 0-100 score on the banner.** Just "lav" / "meget lav" as bucket labels.
- **No mutation of the workout.** The session plan is the source of truth; the banner is read-only.
- **No coach-side leak.** No new RLS surface; `hrv_settings` reads from members only.
- **No silent re-enable.** A member who turns the toggle off stays off until they re-enable it. We do not auto-re-enable based on a string of `normal`-readiness days or app version bumps.
- **No reward.** Reps are never awarded for seeing or "acting on" the nudge (per §8 of the master spec — never reward the HRV value itself).

## 9. Rollout & verification

- **Single deploy.** No feature flag. The trigger conditions are conservative enough that the blast radius is "members with a connected wearable who happen to be in a low-readiness window."
- **Dogfood window.** Product owner + any opt-in crew members for ~5-7 days. Watch for: banner appearing on the right days, copy not feeling preachy, toggle reachable from `/settings`.
- **Success criterion.** Subjective: members say the banner is useful or invisible (not annoying). No analytics in V2.4 — see Non-goals.

## 10. Phasing of V2 remainder (for context)

| Phase | Content | Status |
|---|---|---|
| ✅ V2.1 | Lifestyle logging | Shipped |
| ✅ V2.2 | Claude weekly insights | Shipped |
| ✅ V2.3 | Coach red-flag queue (C-prong) | Shipped |
| **V2.4** | **Session readiness nudge (B-prong, pure)** | **This spec** |
| V2.5 | Reps milestones (90d unbroken sync, +100 first-connection bonus, insights-reviewed) | Future spec |
| V2.6 | Adaptive periodization (D-prong — Claude program-gen reads 28d HRV) | Future spec |

V2.4 is intentionally the smallest of the three remaining sub-phases (no migration, one new component, two existing files extended, one new server action) so we can dogfood the framing before committing to the heavier Reps and Claude-pipeline work.

## 11. Open questions / future work

- **Analytics.** If we later want to measure whether the banner changes behaviour, the cheapest move is post-hoc SQL: for each member, group sessions by the bucket of that day's HRV reading, compare distribution of `logged_weight / target_weight` on top sets. No schema change needed. Add this only if a question forces it.
- **Cross-day stickiness.** Today's design re-evaluates on every session open. If a member runs two sessions in a day (rare), they see the banner twice. Probably fine; revisit if dogfooding shows otherwise.
- **Toggle latency.** The banner is server-rendered on session open, so flipping the settings toggle off does not remove an already-rendered banner from an already-open session — the change takes effect on the next session open / navigation. Documented here so the dogfood loop does not file it as a bug.
- **Wearable-not-connected gentle prompt.** Out of scope for V2.4. If we want to nudge wearable adoption from `/session`, that is a separate experiment (acquisition surface, not recovery surface) and belongs in its own brainstorm.
