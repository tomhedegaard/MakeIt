# Søjle 5 — Mental Health Pillar v0 EVAL

**Date:** 2026-06-08
**Branch:** `claude/makeit-online-platform-XF2UE`
**Phases shipped:** MH-1 .. MH-10 (10/10) — Approach A foundation-first
**Reviewed against spec:** `docs/superpowers/specs/2026-06-07-mental-health-pillar-v0-design.md`

---

## What landed

| Phase | Commit | Lines | Verifiable surface |
|---|---|---|---|
| MH-1 | `ad12216` | 1188 | Migration 0046 + types + `/mind/onboarding` disclaimer |
| MH-2 | `a76d16d` | 793 | `/mind/check` 60-sec flow + 30-day graph + streak badge + evening cron |
| MH-3 | `877fce0` | 868 | `/mind/journal` private + crisis keywords + resources modal stub |
| MH-4 | `55b4240` | 1015 | `/mind/today` AI personal micro-session + BreathingRing + SessionRunner |
| MH-5 | `18150e3` | 291 | `/mind/sessions` library + per-slug runner page |
| MH-6 | `5510c1c` | 332 | Adaptive Engine mental-signal integration helpers + 23 unit tests |
| MH-7 | `32c615c` | 633 | AI mental coach daily cron + fallback + push + CoachReflection render |
| MH-8 | `86990e6` | 531 | `/mind/settings` tier-gated toggles + buddy-mental weekly cron |
| MH-9 | `97c02d7` | 463 | Claude moderation + consent-gated coach escalation + AI-output safety pass |
| MH-10 | `5c4dc8c` | 689 | Migration 0047 cirkler posts + reactions + `/mind/cirkler` (Beast+) + milestone Reps |

**Total**: 10 commits, ~6 800 LOC across migrations, lib, surfaces, and tests.

## Tests

- 45 unit tests pass for `src/lib/mind/*` (streak: 14, crisis: 8, snapshot-contribution: 23).
- 228 total tests pass (45 mind + 183 existing). **Zero regressions** introduced.
- Engine, reasoning, snapshot, apply, persist, history-narratives, mock-scenarios, data tests all still green.

## What works in demo mode (no Supabase)

Full clickable path:
1. `/mind` → disclaimer → tap accept
2. `/mind/check` → 30 days of plausible mock graph, log a check
3. `/mind/journal` → write an entry (crisis keyword test possible: "jeg orker ikke mere" → resources modal)
4. `/mind/today` → AI session generated inline (Claude when `ANTHROPIC_API_KEY` set, else fallback template)
5. `/mind/sessions` → 8 mock hero sessions browsable, runner works
6. `/mind/settings` → toggle UI works (no persist in demo)
7. `/mind/cirkler` → demo cirkel rendered for Munk-tier (Legend)

## What requires `npm run db:types` + migration 0046+0047 against live DB

- Actual streak persistence (mind-check upsert + mental_settings cache)
- Reps awards firing into `reps_transactions` (tier promotion follows automatically via existing 0009 trigger)
- AI coach output cache surviving across requests
- Cirkler posts + reactions
- Coach escalation alerts landing in `hrv_alerts`
- Cron jobs (3 new): mind-check-nudge, mental-coach-daily, buddy-mental-weekly-checkin

## Loose ends

| Item | Severity | Notes |
|---|---|---|
| **Voice decision** | Blocker for v1 audio | Sessions render text+visual only. `mental_sessions.audio_url` + `voice` columns ready. |
| **Migration 0045 + 0046 + 0047 not run against live DB** | Blocker for live crons | Memory note from Søjle 4 carries forward. User runs all three together. |
| **`db:types` regen pending** | Tech debt | `mindDb()` untyped wrapper bridges; remove after regen. |
| **No mind-check on dashboard surface** | Minor | The mental graph + streak only live in `/mind/check`. Future: tile on `/dashboard`. |
| **Adaptive Engine wiring is opt-in, not auto** | Minor | `mentalAwareEngineInput` is a one-line activation in `src/lib/adaptive/data.ts:buildEngineInput` — left explicit so we don't ship unobserved behavior change. |
| **Multi-cirkel UI** | Minor | First cirkel renders inline; multi-cirkel tabs deferred. |
| **Mobile tab bar** | Minor | Desktop nav has `Mind 06`; mobile tab bar (7 tabs) didn't get a slot. Revisit when we cut a tab. |
| **Cirkel reactions: post-side only** | Minor | Reactions render counts; tap-to-react UI deferred. |

## Risks observed

1. **Claude moderation latency** on journal submit. ~2-3s added per entry. Acceptable for now (journaling isn't time-critical) but worth measuring in production. Mitigation: keyword filter is synchronous; Claude is the second pass.
2. **Mock data in demo mode** for AI coach output requires `ANTHROPIC_API_KEY` to be visible — without it the fallback runs every time. Fine for demo; production needs the key.
3. **Crisis classification false-positive rate** is unmeasured. The spec called this out as monitor-after-first-30-days; the surface is conservative (any flag wins) so the wrong direction is "too many resources modals," not "missed crisis."

## What "førende" looks like at this point

Three things now exist at MakeIt that don't exist anywhere else:

1. **Mind-check × HRV fused into Adaptive Engine.** No wellness app fuses subjective mental data with HRV and training-load reasoning. The pure helpers in `snapshot-contribution.ts` are tested for the rule (`green→yellow on 3+ low days, hold at very_low`) and ready to flip on at the engine boundary.

2. **AI mental coach trained on real training week.** Claude reads the member's mind-check + HRV + week — not generic prompts. The cron pre-warms output for 06:30 push. Fallback is deterministic and context-aware so the experience never empties out.

3. **Tier-gated mental crew.** Privacy as progression (Lifter private → Athlete unlocks buddy-share → Beast unlocks cirkler → Legend leads). RLS enforces; the new `mind_check_visible_to()` predicate makes mutual opt-in the literal database rule. No competitor with the same pyramid model.

The 6-mdr wauw-plan now has 5 søjler. Søjle 5 is shipped end-to-end at the same rhythm as Søjle 1-4.

## Suggested B-layer priorities (before C-checkpoint)

1. **Hero session content polish** — the 8 seeded scripts are functional; B can rewrite them with sharper Munk-voice (text-only craft, voice decision still parked).
2. **Marketing landing surface** — a 5. søjle hero block on the existing landing rebuild to make the new pillar visible publicly.
3. **`/dashboard` mind-tile** — small surface that shows "log dit mind-check" or "dagens refleksion klar" without jumping to `/mind`.

C-checkpoint should decide: voice direction, multi-cirkel UI, dashboard tile depth, marketing surface tone.
