import {
  formatFeelingState,
  formatReadinessBucket,
  formatRpeDelta,
  formatSleepHours,
  labelForAction,
  narrateRule,
} from "@/lib/adaptive/reason-narratives";
import type {
  AdaptiveAction,
  AdaptiveActionParams,
  EngineInput,
  RuleReasonCode,
} from "@/lib/adaptive/types";

/**
 * Rule-layer output, narrowed for this component. Matches the shape
 * the persistence layer writes into hrv_session_modifiers.rule_decision
 * (see persist.ts buildModifierRow).
 */
export interface RuleDecisionForPanel {
  action: AdaptiveAction;
  reasons: RuleReasonCode[];
  confidence: number;
  params: AdaptiveActionParams;
}

/**
 * Claude reasoning-layer output, narrowed for this component. Null
 * when the reasoning layer was skipped (rule-only decision) or
 * unavailable (no ANTHROPIC_API_KEY in dev / API error in prod).
 * The persistence layer stores the raw blob in reasoning_output —
 * we narrow to just the fields we display.
 */
export interface ReasoningOutputForPanel {
  finalAction: AdaptiveAction;
  confidence: number;
}

type Props = {
  signals: EngineInput;
  ruleDecision: RuleDecisionForPanel;
  reasoningOutput: ReasoningOutputForPanel | null;
  /** Count from snapshot — array itself is dropped (lossy). */
  recentFormCheckCount: number;
};

/**
 * Reasoning detail panel (T2) — rendered inside the AdaptationCard's
 * "Vis tankegang" disclosure. Three stacked subpanels:
 *
 *   1. Hvad motoren så  — signal rows from the hydrated EngineInput
 *   2. Hvilken regel fyrede  — narrateRule output
 *   3. Hvad Munks assistent justerede  — only when reasoningOutput
 *      is non-null
 *
 * Server component — no state, no interactivity beyond the parent
 * <details> toggle. The counterfactual sliders (T3) live in a
 * separate client component nested below this one.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §3
 */
export default function ReasoningDetailPanel({
  signals,
  ruleDecision,
  reasoningOutput,
  recentFormCheckCount,
}: Props) {
  const reading = signals.latestReading;
  const lastSession =
    signals.recentSessions.length > 0
      ? signals.recentSessions[signals.recentSessions.length - 1]
      : null;
  const missedSessions = signals.recentSessions.filter(
    (s) => s.status === "skipped"
  ).length;

  return (
    <div className="space-y-5 pt-3 border-t hairline">
      {/* ------------------------------------------------------------ */}
      {/* Subpanel 1: signals the engine saw                            */}
      {/* ------------------------------------------------------------ */}
      <section aria-labelledby="reasoning-signals-heading">
        <h3 id="reasoning-signals-heading" className="eyebrow mb-3">
          Hvad motoren så
        </h3>
        <ul className="space-y-1.5">
          <SignalRow
            label="HRV i dag"
            value={formatReadinessBucket(reading?.readinessBucket ?? null)}
          />
          <SignalRow
            label="Søvn (2d snit)"
            value={formatSleepHours(signals.lifestyle.sleepHoursAvg2d)}
          />
          <SignalRow
            label="Alkohol seneste 2 dage"
            value={signals.lifestyle.alcoholLast2d ? "Ja" : "Nej"}
          />
          <SignalRow
            label="Følelse seneste log"
            value={formatFeelingState(signals.lifestyle.feelingLast3d)}
          />
          {lastSession ? (
            <SignalRow
              label="Sidste session RPE"
              value={formatRpeDelta(
                lastSession.topSetRpeAvg,
                lastSession.topSetTargetRpeAvg
              )}
            />
          ) : null}
          {missedSessions > 0 ? (
            <SignalRow
              label="Missede sessions (sidste 3)"
              value={`${missedSessions}`}
            />
          ) : null}
          {signals.veryLowDaysLast5 > 0 ? (
            <SignalRow
              label="Meget lave HRV-dage (sidste 5)"
              value={`${signals.veryLowDaysLast5}`}
            />
          ) : null}
          <SignalRow
            label="Form-checks seneste 7 dage"
            value={`${recentFormCheckCount}`}
          />
          {signals.daysSinceHeavyLift !== null ? (
            <SignalRow
              label="Dage siden tungt løft"
              value={`${signals.daysSinceHeavyLift}`}
            />
          ) : null}
          {reading?.isSick ? (
            <SignalRow label="Syg-markering" value="Aktiv" />
          ) : null}
        </ul>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Subpanel 2: which rule fired                                  */}
      {/* ------------------------------------------------------------ */}
      <section aria-labelledby="reasoning-rule-heading">
        <h3 id="reasoning-rule-heading" className="eyebrow mb-2">
          Hvilken regel fyrede
        </h3>
        <p className="text-sm font-mono text-fg-dim leading-relaxed">
          {narrateRule({
            action: ruleDecision.action,
            reasons: ruleDecision.reasons,
          })}
        </p>
        <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-2">
          Regel-confidence {ruleDecision.confidence.toFixed(2)}
        </p>
      </section>

      {/* ------------------------------------------------------------ */}
      {/* Subpanel 3: Claude refinement (optional)                      */}
      {/* ------------------------------------------------------------ */}
      {reasoningOutput ? (
        <section aria-labelledby="reasoning-claude-heading">
          <h3 id="reasoning-claude-heading" className="eyebrow mb-2">
            Hvad Munks assistent justerede
          </h3>
          <p className="text-sm text-fg-dim leading-relaxed">
            {describeClaudeRefinement(ruleDecision, reasoningOutput)}
          </p>
        </section>
      ) : null}
    </div>
  );
}

/* ================================================================== *
 * Internal: signal row + Claude refinement narrative
 * ================================================================== */

function SignalRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-fg-faint text-[11px] uppercase tracking-[0.12em] shrink-0">
        {label}
      </span>
      <span className="text-fg numeric text-right">{value}</span>
    </li>
  );
}

/**
 * One-sentence comparison of the rule layer's proposed decision vs
 * Claude's refinement. Three shapes:
 *   - Same action, same confidence: "Bekræftede reglen"
 *   - Same action, different confidence: "Bekræftede reglen, justerede confidence"
 *   - Different action: "Justerede til <new action>"
 *
 * Confidence-only differences are reported when |delta| ≥ 0.05 so
 * tiny floating-point jitter doesn't get a sentence of its own.
 */
function describeClaudeRefinement(
  rule: RuleDecisionForPanel,
  reasoning: ReasoningOutputForPanel
): string {
  if (rule.action !== reasoning.finalAction) {
    return `Reglen foreslog ${labelForAction(rule.action)}; AI justerede til ${labelForAction(reasoning.finalAction)}.`;
  }
  const confDelta = reasoning.confidence - rule.confidence;
  if (Math.abs(confDelta) >= 0.05) {
    const direction = confDelta > 0 ? "op" : "ned";
    return `Bekræftede reglen (${labelForAction(reasoning.finalAction)}) og justerede confidence ${direction} til ${reasoning.confidence.toFixed(2)}.`;
  }
  return `Bekræftede reglen (${labelForAction(reasoning.finalAction)}, confidence ${reasoning.confidence.toFixed(2)}).`;
}
