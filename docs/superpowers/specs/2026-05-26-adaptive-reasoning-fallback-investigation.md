# Adaptive reasoning layer — Claude refinement falling back to null

Status: open investigation. Not blocking PR #17; cosmetic gap in
Open Brain UI demo.

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
