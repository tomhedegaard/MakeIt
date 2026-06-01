"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ExercisePhase } from "@/lib/data/exercises";
import { buildCuePhaseMap } from "@/lib/exercise/cue-phase-mapping";

/**
 * Ordered cue list with a "currently active" highlight driven by the
 * rep's phase animation. When the parent feeds `activePhaseIdx`, the
 * cue(s) anchored to that phase fade in (numeric prefix to fg, body
 * text to fg, accent strip on the left). When `phases` is empty or
 * `activePhaseIdx` is null, every cue renders inactive — same look
 * as the legacy plain ordered list this replaces.
 *
 * Mapping is inferred (see lib/exercise/cue-phase-mapping.ts), so no
 * coach data entry is required. A small phase chip above the list
 * shows the active phase name to make the sync legible.
 */
export default function CuesList({
  cues,
  phases,
  activePhaseIdx,
}: {
  cues: string[];
  phases: ExercisePhase[];
  /** Null when no live phase loop is running (e.g. static figure mode). */
  activePhaseIdx: number | null;
}) {
  const t = useTranslations("Train.hero");
  const map = useMemo(
    () => buildCuePhaseMap(cues.length, phases.length),
    [cues.length, phases.length],
  );

  const activePhase =
    activePhaseIdx != null && phases[activePhaseIdx]
      ? phases[activePhaseIdx]
      : null;

  return (
    <div className="space-y-4">
      {activePhase ? (
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.14em]">
          <span className="size-1.5 rounded-full bg-fg" aria-hidden />
          <span className="text-fg-faint">{t("currentPhase")}</span>
          <span className="text-fg">{activePhase.name}</span>
        </div>
      ) : null}

      <ol className="space-y-3" aria-label={t("howTo")}>
        {cues.map((cue, i) => {
          const isActive =
            activePhaseIdx != null && map[i] === activePhaseIdx;
          return (
            <li
              key={i}
              data-active={isActive}
              className={`flex gap-4 pl-3 -ml-3 border-l-2 transition-colors duration-200 ${
                isActive ? "border-l-[#C97B3E]" : "border-l-transparent"
              }`}
            >
              <span
                className={`font-display text-2xl shrink-0 w-8 leading-none mt-0.5 transition-colors duration-200 ${
                  isActive ? "text-fg" : "text-fg-faint"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`text-base md:text-lg leading-snug transition-colors duration-200 ${
                  isActive ? "text-fg" : "text-fg/85"
                }`}
              >
                {cue}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
