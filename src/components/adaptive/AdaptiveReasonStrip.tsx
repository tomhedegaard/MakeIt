import MotorGlyph from "@/components/adaptive/MotorGlyph";
import DomainMark, { type Domain } from "@/components/brand/DomainMark";
import type {
  EngineStripModel,
  StripStepKey,
} from "@/lib/adaptive/engine-strip";

export type AdaptiveStripCopy = {
  why: string;
  attribution: string;
  munkNoteLabel: string;
  steps: Record<StripStepKey, string>;
};

/**
 * Collapsible Adaptive Engine reason strip. Collapsed by default.
 * Native <details> — no JS state. Attribution is the Motor glyph,
 * never a face or a personality label.
 */
export default function AdaptiveReasonStrip({
  model,
  copy,
}: {
  model: EngineStripModel;
  copy: AdaptiveStripCopy;
}) {
  if (model.steps.length === 0) return null;

  return (
    <details
      data-engine-strip=""
      className="group border-t hairline"
    >
      <summary className="cursor-pointer list-none px-5 py-3 flex items-center gap-3 select-none touch-app hover:bg-bg-3/60">
        <MotorGlyph className="text-fg-dim" />
        <span className="eyebrow flex-1">{copy.why}</span>
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint hidden sm:inline">
          {copy.attribution}
        </span>
        <span
          aria-hidden
          className="text-fg-faint text-xs group-open:rotate-180 transition-transform"
        >
          ↓
        </span>
      </summary>

      <div className="px-5 pb-4 space-y-3">
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint sm:hidden">
          <MotorGlyph className="size-3" />
          <span>{copy.attribution}</span>
        </div>

        {model.munkNote ? (
          <p
            data-munk-note=""
            className="text-sm text-fg-dim leading-relaxed"
          >
            <span className="eyebrow block mb-1">{copy.munkNoteLabel}</span>
            {model.munkNote}
          </p>
        ) : null}

        <ol data-engine-steps="" className="space-y-2">
          {model.steps.map((step, i) => (
            <li
              key={`${step.domain}-${step.key}-${i}`}
              data-strip-step={step.key}
              data-strip-domain={step.domain}
              className="flex items-start gap-3"
            >
              <span className="numeric text-fg-faint text-xs w-5 pt-0.5 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span data-domain={step.domain} className="mt-0.5 shrink-0">
                <DomainMark
                  domain={step.domain as Domain}
                  className="size-4 text-domain"
                />
              </span>
              <span className="text-sm text-fg-dim leading-relaxed">
                {copy.steps[step.key]}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
