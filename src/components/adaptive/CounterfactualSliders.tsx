"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import { evaluateAdaptation } from "@/lib/adaptive/engine";
import {
  formatFeelingState,
  formatSleepHours,
  labelForAction,
} from "@/lib/adaptive/reason-narratives";
import type {
  AdaptiveAction,
  CandidateDecision,
  EngineInput,
} from "@/lib/adaptive/types";
import type { FeelingState } from "@/lib/hrv/lifestyle";
import { TELEMETRY, track } from "@/lib/telemetry";

type Props = {
  /**
   * The EngineInput at decision time — hydrated from the persisted
   * snapshot, so wall-clock and non-lifestyle fields match what the
   * engine actually saw.
   */
  baseline: EngineInput;
  /**
   * The rule layer's verdict on `baseline`. Used only for the "var: X"
   * diff text; the component re-derives the hypothetical decision
   * from the mutated input via evaluateAdaptation.
   */
  baselineDecision: CandidateDecision;
  /**
   * Modifier id for telemetry events. Pass "explainer" (or similar
   * sentinel) when rendered from the static /hrv/learn/adaptive page
   * where there's no real modifier; telemetry distinguishes the two
   * use cases via the property value.
   */
  modifierId: string;
};

/**
 * Sensible slider defaults when the baseline value is null (member
 * never logged that dimension). We pick benign mid-range values so
 * the playground starts in a calm spot, not e.g. 0t sleep.
 */
const DEFAULT_SLEEP_HOURS = 7;
const DEFAULT_FEELING: FeelingState = "ok";

const SLEEP_STEP = 0.25;
const SLEEP_MIN = 3;
const SLEEP_MAX = 11;

const FEELING_OPTIONS: { value: FeelingState; label: string }[] = [
  { value: "fresh", label: "Frisk" },
  { value: "ok", label: "Okay" },
  { value: "tired", label: "Træt" },
  { value: "stressed", label: "Stresset" },
];

/**
 * Counterfactual sliders (T3) — the wauw surface from spec §3.
 *
 * Three controls mutate the lifestyle dimensions on the hydrated
 * EngineInput; the rule layer re-evaluates against the mutated copy
 * and the result renders alongside. Because `evaluateAdaptation` is a
 * pure function that returns in <10ms, this whole loop runs entirely
 * in the browser — no API call, no spinner, no server round-trip.
 *
 * The hydrator deliberately drops `recentFormChecks` and
 * `nextSession.exercises` so the engine's `form_check_concern` and
 * `exercise_swap_variant` paths can't fire from a hydrated input.
 * That's the spec's "lossy by design": v0 counterfactuals only mutate
 * lifestyle, which doesn't touch those branches, so the lossy
 * reconstruction is exactly enough.
 *
 * `useDeferredValue` wraps each slider's value so a rapid drag doesn't
 * queue dozens of evaluations — React batches and only the latest
 * settled value triggers re-evaluation.
 */
export default function CounterfactualSliders({
  baseline,
  baselineDecision,
  modifierId,
}: Props) {
  // Initial state from baseline, with sensible fallbacks for null
  // values (member never logged that dimension).
  const baselineSleep = baseline.lifestyle.sleepHoursAvg2d ?? DEFAULT_SLEEP_HOURS;
  const baselineAlcohol = baseline.lifestyle.alcoholLast2d;
  const baselineFeeling = baseline.lifestyle.feelingLast3d ?? DEFAULT_FEELING;

  const [sleep, setSleep] = useState<number>(baselineSleep);
  const [alcohol, setAlcohol] = useState<boolean>(baselineAlcohol);
  const [feeling, setFeeling] = useState<FeelingState>(baselineFeeling);

  // Defer values so rapid drags don't trigger per-pixel re-evaluation.
  const deferredSleep = useDeferredValue(sleep);
  const deferredAlcohol = useDeferredValue(alcohol);
  const deferredFeeling = useDeferredValue(feeling);

  // Mutated input — same shape as baseline, lifestyle replaced.
  const mutatedInput: EngineInput = useMemo(
    () => ({
      ...baseline,
      lifestyle: {
        sleepHoursAvg2d: deferredSleep,
        alcoholLast2d: deferredAlcohol,
        feelingLast3d: deferredFeeling,
      },
    }),
    [baseline, deferredSleep, deferredAlcohol, deferredFeeling]
  );

  const hypothetical: CandidateDecision = useMemo(
    () => evaluateAdaptation(mutatedInput),
    [mutatedInput]
  );

  const sliderTouched =
    sleep !== baselineSleep ||
    alcohol !== baselineAlcohol ||
    feeling !== baselineFeeling;

  const decisionMatches = hypothetical.action === baselineDecision.action;

  // ---- Telemetry: fire-once `used` event on first slider change ----
  const usedFiredRef = useRef(false);
  useEffect(() => {
    if (usedFiredRef.current || !sliderTouched) return;
    usedFiredRef.current = true;
    // Detect which dimension differs from baseline first — gives the
    // dashboard a sense of which control draws the most curiosity.
    const dimensionChanged: "sleep" | "alcohol" | "feeling" =
      sleep !== baselineSleep
        ? "sleep"
        : alcohol !== baselineAlcohol
          ? "alcohol"
          : "feeling";
    track(TELEMETRY.adaptiveCounterfactualUsed, {
      modifier_id: modifierId,
      dimension_changed: dimensionChanged,
    });
  }, [
    sliderTouched,
    sleep,
    alcohol,
    feeling,
    baselineSleep,
    baselineAlcohol,
    baselineFeeling,
    modifierId,
  ]);

  // ---- Telemetry: fire `result` event only when the hypothetical
  // action crosses a rule boundary (changes from the last-seen one).
  // This naturally debounces intermediate slider positions that
  // didn't flip the decision.
  const lastActionRef = useRef<AdaptiveAction>(baselineDecision.action);
  useEffect(() => {
    if (hypothetical.action === lastActionRef.current) return;
    lastActionRef.current = hypothetical.action;
    track(TELEMETRY.adaptiveCounterfactualResult, {
      modifier_id: modifierId,
      hypothetical_action: hypothetical.action,
      baseline_action: baselineDecision.action,
      would_have_changed: hypothetical.action !== baselineDecision.action,
    });
  }, [hypothetical.action, baselineDecision.action, modifierId]);

  function reset() {
    setSleep(baselineSleep);
    setAlcohol(baselineAlcohol);
    setFeeling(baselineFeeling);
  }

  return (
    <details className="group/cf mt-2 pt-2 border-t hairline">
      <summary className="cursor-pointer list-none text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg select-none inline-flex items-center gap-1 lift touch-app">
        <span>Hvad hvis du havde…</span>
        <span aria-hidden className="group-open/cf:rotate-180 transition-transform">↓</span>
      </summary>

      <div className="space-y-4 pt-3">
        {/* ----------------- Sleep slider ----------------- */}
        <ControlRow
          label="Søvn (2-dages snit)"
          actualLabel={
            baseline.lifestyle.sleepHoursAvg2d === null
              ? "ikke logget"
              : formatSleepHours(baseline.lifestyle.sleepHoursAvg2d)
          }
          changed={sleep !== baselineSleep}
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={SLEEP_MIN}
              max={SLEEP_MAX}
              step={SLEEP_STEP}
              value={sleep}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSleep(Number(e.currentTarget.value))
              }
              aria-label="Søvn i timer"
              className="flex-1 accent-fg touch-app"
            />
            <span className="numeric text-sm tabular-nums w-14 text-right">
              {formatSleepHours(sleep)}
            </span>
          </div>
        </ControlRow>

        {/* ----------------- Alcohol toggle ----------------- */}
        <ControlRow
          label="Alkohol seneste 2 dage"
          actualLabel={baselineAlcohol ? "Ja" : "Nej"}
          changed={alcohol !== baselineAlcohol}
        >
          <label className="flex items-center gap-2 cursor-pointer touch-app">
            <input
              type="checkbox"
              checked={alcohol}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAlcohol(e.currentTarget.checked)
              }
              className="size-4 accent-fg"
            />
            <span className="text-sm">{alcohol ? "Ja" : "Nej"}</span>
          </label>
        </ControlRow>

        {/* ----------------- Feeling selector ----------------- */}
        <ControlRow
          label="Følelse seneste log"
          actualLabel={
            baseline.lifestyle.feelingLast3d === null
              ? "ikke logget"
              : formatFeelingState(baseline.lifestyle.feelingLast3d)
          }
          changed={feeling !== baselineFeeling}
        >
          <select
            value={feeling}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setFeeling(e.currentTarget.value as FeelingState)
            }
            aria-label="Følelse"
            className="bg-bg-2 border hairline rounded-md px-2 py-1 text-sm touch-app"
          >
            {FEELING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </ControlRow>

        {/* ----------------- Reset ----------------- */}
        {sliderTouched ? (
          <button
            type="button"
            onClick={reset}
            className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint hover:text-fg lift touch-app"
          >
            ← Nulstil til faktiske værdier
          </button>
        ) : null}

        {/* ----------------- Result ----------------- */}
        <div className="surface-3 rounded-lg p-3 border hairline space-y-1.5">
          <div className="eyebrow text-fg-faint">Motoren ville have valgt</div>
          {decisionMatches && !sliderTouched ? (
            <ResultBlock
              headline="Samme beslutning"
              detail="Du er ved baseline-værdierne — træk i en slider for at simulere."
              tone="quiet"
            />
          ) : decisionMatches ? (
            <ResultBlock
              headline={`Samme beslutning: ${labelForAction(hypothetical.action)}`}
              detail={hypothetical.explanationDa}
              tone="quiet"
            />
          ) : (
            <ResultBlock
              headline={labelForAction(hypothetical.action)}
              detail={hypothetical.explanationDa}
              tone="loud"
              previous={`Var: ${labelForAction(baselineDecision.action)}`}
            />
          )}
        </div>
      </div>
    </details>
  );
}

/* ================================================================== *
 * Internal layout primitives
 * ================================================================== */

function ControlRow({
  label,
  actualLabel,
  changed,
  children,
}: {
  label: string;
  actualLabel: string;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-fg-faint">
          {label}
        </span>
        {changed ? (
          <span className="text-[10px] font-mono tracking-[0.12em] text-fg-faint">
            faktisk: {actualLabel}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ResultBlock({
  headline,
  detail,
  previous,
  tone,
}: {
  headline: string;
  detail: string;
  previous?: string;
  tone: "quiet" | "loud";
}) {
  return (
    <>
      <div
        className={`text-sm numeric ${tone === "loud" ? "text-fg" : "text-fg-dim"}`}
      >
        → {headline}
      </div>
      <p className="text-xs text-fg-dim leading-relaxed">{detail}</p>
      {previous ? (
        <p className="text-[10px] font-mono uppercase tracking-[0.12em] text-fg-faint">
          {previous}
        </p>
      ) : null}
    </>
  );
}

/* ================================================================== *
 * Exports for testing — pure helpers that can be exercised without
 * mounting the component. The component itself is presentational and
 * trusts the rule layer (which is exhaustively unit-tested).
 * ================================================================== */

/**
 * Build the mutated EngineInput a counterfactual would feed to the
 * engine. Exported so tests can verify the mutation shape matches
 * what the rule layer expects without mounting React.
 */
export function buildCounterfactualInput(
  baseline: EngineInput,
  overrides: {
    sleepHoursAvg2d: number;
    alcoholLast2d: boolean;
    feelingLast3d: FeelingState;
  }
): EngineInput {
  return {
    ...baseline,
    lifestyle: {
      sleepHoursAvg2d: overrides.sleepHoursAvg2d,
      alcoholLast2d: overrides.alcoholLast2d,
      feelingLast3d: overrides.feelingLast3d,
    },
  };
}

/** Action equality helper for tests that want to assert "changed vs not". */
export function counterfactualChangedAction(
  baselineAction: AdaptiveAction,
  hypotheticalAction: AdaptiveAction
): boolean {
  return baselineAction !== hypotheticalAction;
}
