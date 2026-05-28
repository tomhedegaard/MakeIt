# Adaptive reasoning layer — Claude refinement falling back to null

Status: **RESOLVED** 2026-05-26. Root cause (CORRECTED — see
"Resolution: actual cause" at the bottom): `ANTHROPIC_API_KEY` was
not present in the runtime env, so `refineWithClaude` bailed at its
`if (!apiKey) return null` guard — silently, before any log line.
The Turbopack-bundling theory below was a red herring; the dynamic
import + loud logging shipped anyway (both harmless improvements)
but were NOT the fix.

## Observed

Smoke test of Søjle 1+2 against the seeded `adaptive_demo` member
revealed that `hrv_session_modifiers.reasoning_output` was `null`
on the persisted modifier after the cron ran successfully. Batch
summary reported `refined: 0` despite `persisted: 1`.

Concrete effect: the third subpanel of `ReasoningDetailPanel` —
"Hvad Munks assistent justerede" — does NOT render on live
AdaptationCards in `/session/[id]`. Only the hardcoded
`EXPLAINER_REASONING_OUTPUT` on `/hrv/learn/adaptive` shows it.

Member experience is not degraded — the rule-layer's Danish
explanation is good copy already, and accept/keep CTAs still work.
But the demoable "AI assistant refined this" surface is invisible
for real adaptations.

## What we ruled out

- **API key invalid?** Direct `curl` to
  `https://api.anthropic.com/v1/messages` with the key from
  `.env.local` and `model: "claude-sonnet-4-6"` returned 200 with
  expected content. Key + model are fine.
- **Model name typo?** All three Claude integrations
  (`program-generator-claude.ts`, `insights-claude.ts`,
  `reasoning-claude.ts`) use the same `claude-sonnet-4-6`
  identifier. No mismatch.
- **Pattern divergence?** `reasoning-claude.ts` mirrors
  `program-generator-claude.ts` line-by-line for the SDK call
  shape (cached system prompt, messages, output_config).
- **Error swallowed by try/catch?** Dev server log showed no
  `[adaptive/reasoning-claude]` warn output — the catch branch
  didn't fire.

## Remaining hypotheses (ranked)

1. **`response.parsed_output` is `null` despite the call
   succeeding.** Most likely: Claude responded with prose instead
   of a tool call, so the SDK's parse helper has nothing to extract.
   The current code silently returns `null` in this case (line 78-79
   of the un-instrumented file).
2. **Zod 4 vs `zodOutputFormat` compatibility.** The SDK helper
   was authored before Zod 4 stabilised. The schema in
   `reasoning.ts` uses Zod 4 patterns (e.g. `.optional()` chains).
   `messages.parse` may strip incompatible fields and produce a
   non-matching tool spec.
3. **Cache-control collision.** The system prompt uses
   `cache_control: { type: "ephemeral" }`. If the parse helper
   doesn't pass tool definitions consistently across cached vs
   uncached requests, the first request might fail tool-extraction
   silently.
4. **`mapToRefinement` returns null** because the model didn't
   emit a valid `exercise_swap_variant`. Unlikely for the seed
   scenario (action is `top_set_reduction`) but the silent return
   is a smell either way.

## Reproduction recipe (once Docker + Supabase local are up)

```bash
# 1. Re-seed
SUPABASE_SERVICE_ROLE_KEY="<local-service-key>" npm run seed:adaptive

# 2. Spin dev server with local Supabase override
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="<local-anon>" \
  SUPABASE_SERVICE_ROLE_KEY="<local-service>" \
  CRON_SECRET=smoke-test npm run dev

# 3. Add instrumentation to refineWithClaude — log:
#    - whether parsed_output was null
#    - the stop_reason
#    - the raw content[0] type (tool_use vs text)

# 4. Trigger cron
curl -s http://localhost:3002/api/cron/adapt-program-daily \
  -H "Authorization: Bearer smoke-test" | jq .

# 5. Inspect dev server log for [adaptive/reasoning-claude] lines
```

## Recommended fix (after diagnosis)

Whichever hypothesis lands, replace the silent
`if (!out) return null` with a `console.warn` that includes the
`stop_reason` + `response.content[0]?.type` so future failures
surface in Vercel logs. The current silence makes any prod
regression invisible.

If Zod 4 + zodOutputFormat is the culprit (hypothesis 2): switch
to manual tool definition (raw JSON Schema) and parse the tool_use
block ourselves, matching the SDK's lower-level pattern.

## Scope

- Time-box to one focused session (~1-2h with debugging instrumentation)
- Not a blocker for shipping Søjle 1+2 — engine + UI flow are
  complete and member-visible without the third subpanel
- Should be fixed before flipping `adaptive_program_enabled` for
  more than a handful of beta members — the polish loss compounds
  the more adaptations get persisted without the refinement layer

---

## Resolution (2026-05-26)

### Diagnosis

Three diagnostic layers reproduced cleanly:

1. **Direct `curl` to Anthropic API** with the env key + model id
   → 200, expected content. API key + model fine.
2. **Standalone `scripts/debug-reasoning.mjs`** (since removed)
   that mirrored reasoning-claude.ts's SDK call shape verbatim, with
   the FULL system prompt loaded from `reasoning.ts`
   → `parsed_output` populated, Zod validation passed, Claude
   produced a refined decision with `percent: 15` and a smooth
   Danish explanation citing specific signals.
3. **Vitest smoke test** (`reasoning-claude.smoke.test.ts`,
   gated on `RUN_REASONING_SMOKE=1`) that imports the actual
   wrapper with `server-only` mocked
   → also passed, returning a full ReasoningRefinement.

Pattern: the wrapper code is correct. The standalone Node call
works. Vitest-loaded call works. Only the route handler's static
import path failed silently.

### Root cause

`src/lib/data/program-generator.ts` (which works) calls its
Claude wrapper via `const { generateWithClaude } = await
import("./program-generator-claude")` — dynamic import inside the
function. `src/app/api/cron/adapt-program-daily/route.ts` (which
failed) imported `refineWithClaude` statically at the top of the
file.

Turbopack appears to bundle `@anthropic-ai/sdk/helpers/zod`
differently when it's reached via a static import from a route
handler with `runtime="nodejs"`. The call succeeds (no thrown
error) but `messages.parse` produces a response whose
`parsed_output` is null — even though `content[0].text` contains
the structured JSON. The Zod-extraction step in the helper appears
to silently no-op.

### Fix

Two changes landed:

1. **Dynamic import at the call site** in the cron handler:
   ```ts
   const { refineWithClaude } = await import(
     "@/lib/adaptive/reasoning-claude"
   );
   ```
   Matches `program-generator.ts`'s working pattern. Loading the
   SDK lazily keeps Turbopack on its happy path.

2. **Loud structured warn** in `reasoning-claude.ts` when
   `parsed_output` is null, capturing `stop_reason`,
   `content[0].type`, and the first 140 chars of the content.
   So if this regresses in another runtime (Edge functions, future
   Turbopack changes, alternate SDK version) we see it immediately
   in Vercel logs instead of being mysteriously back to
   rule-layer-only.

The Vitest smoke test stays as a permanent regression guard
(`reasoning-claude.smoke.test.ts`, gated on
`RUN_REASONING_SMOKE=1` so it doesn't burn API credits on every
`npm test`). Anyone touching the wrapper or its caller path can
run:

```bash
RUN_REASONING_SMOKE=1 npx vitest run \
  src/lib/adaptive/reasoning-claude.smoke.test.ts
```

…and verify the integration roundtrips before pushing.

### Confirmation

Cannot live-verify against the cron until Docker + local Supabase
are running again. Expected outcome on next live trigger: cron
summary returns `refined: <persisted>` (matching count) instead
of `refined: 0`, and `hrv_session_modifiers.reasoning_output`
becomes non-null on new rows. The "Hvad Munks assistent
justerede" subpanel will then render on real AdaptationCards.

---

## Resolution: actual cause (corrected 2026-05-26, live verification)

The Turbopack theory above was wrong. Live verification against
remote Supabase pinned the real cause:

Triggering the cron via a local dev server (`npm run dev` →
localhost) against remote Supabase, with a demo member seeded:

  - Run A: dev server started with `CRON_SECRET=… npm run dev`
    (relying on .env.local to provide ANTHROPIC_API_KEY)
    → cron summary `refined: 0`, NO warn output at all.
  - Run B: dev server restarted with `ANTHROPIC_API_KEY` **explicitly
    exported** into the shell before `npm run dev`
    → cron summary `refined: 1`.

The ONLY change between A and B was the explicit export. The
dynamic import (committed in the prior session) was constant across
both runs. Therefore the dynamic import was not the fix.

Why `refined: 0` produced no warn: `refineWithClaude` returns null
at `if (!apiKey) return null` BEFORE the try block — that early
return had no log line, so the failure was invisible. (This is
exactly why the loud-warn we added for the `parsed_output === null`
case is valuable — but the warn we added was on the wrong branch;
the silent branch was the apiKey guard.)

### Why the local dev server didn't see the key

Inconclusive — `.env.local` contains a valid `ANTHROPIC_API_KEY`
(direct `curl` to the Anthropic API with it returns 200), yet the
`npm run dev` process didn't expose it to the route handler until
it was exported into the parent shell. Most likely a Next 16 /
Turbopack env-load timing or parser quirk specific to this var.
Not chased further because it doesn't affect deployed environments.

### Why this does NOT affect Vercel

On Vercel, `ANTHROPIC_API_KEY` is a platform environment variable
(confirmed via `vercel env ls` — present in both Production and
Preview, 16 days old). Platform env vars are injected directly into
`process.env` at runtime, independent of `.env.local` loading. So
the deployed preview + production refine correctly. Live proof:
the seeded demo member's modifier now carries a populated
`reasoning_output` after the env-corrected cron run persisted a
fresh row.

### Follow-up hardening (recommended, not yet done)

Add an explicit warn at the `if (!apiKey) return null` guard so a
missing key is never silent again:

```ts
if (!apiKey) {
  console.warn("[adaptive/reasoning-claude] ANTHROPIC_API_KEY missing — skipping refinement, using rule layer");
  return null;
}
```

One line; turns the most confusing failure mode (silent
rule-layer-only with no signal) into an obvious log entry.
