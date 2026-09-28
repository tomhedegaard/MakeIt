"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { ExercisePhase } from "@/lib/data/exercises";

/**
 * Sync the cue-list's active phase index to a looping demo video.
 *
 * The visual brief (docs/EXERCISE_VISUAL_BRIEF.md) requires that the
 * delivered loop's frame timing aligns with the DB's `phases[]`
 * durations — descent at the first segment, drive at the last, etc.
 * Given that contract, we just read `video.currentTime`, modulo it
 * by the total cycle duration, and walk the cumulative phase offsets
 * to find which phase is on screen right now.
 *
 * The poll runs on requestAnimationFrame so it stays at the
 * display's refresh rate without scheduling extra work, and pauses
 * automatically when the video is paused / ended (no rAF re-arm).
 * State updates only fire when the computed phase index actually
 * changes, so a 3-phase loop at 30 fps causes ~3 React renders per
 * cycle, not 90.
 *
 * Returns null while the video element hasn't mounted or when
 * `phases` is empty — callers should treat that the same as "no
 * phase to highlight right now".
 */
export function useVideoPhaseSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  phases: ExercisePhase[],
): number | null {
  const [phaseIdx, setPhaseIdx] = useState<number | null>(null);
  // Cumulative table lives in refs so the rAF callback doesn't see a
  // stale closure if phases swap mid-loop (rare, but happens on the
  // spike page where presets change).
  const cumulativeRef = useRef<number[]>([]);
  const totalRef = useRef(0);
  const [trackedPhases, setTrackedPhases] = useState(phases);

  // Reset reported idx during render when phases swap so the next poll
  // fires a fresh onChange even if the new list produces the same
  // numeric index — protects against stale highlights on exercise change.
  // (Adjusting state during render is the react-hooks replacement for
  // "reset state in an effect when a prop changes".)
  if (phases !== trackedPhases) {
    setTrackedPhases(phases);
    setPhaseIdx(null);
  }

  useEffect(() => {
    const cum: number[] = [];
    let running = 0;
    for (const p of phases) {
      running += p.duration_ms;
      cum.push(running);
    }
    cumulativeRef.current = cum;
    totalRef.current = running;
  }, [phases]);

  useEffect(() => {
    if (phases.length === 0) return;
    const video = videoRef.current;
    if (!video) return;

    let raf = 0;
    let lastIdx = -1;

    const tick = () => {
      const total = totalRef.current;
      const cum = cumulativeRef.current;
      if (total > 0 && cum.length > 0) {
        const tMs = (video.currentTime * 1000) % total;
        let idx = cum.length - 1;
        for (let i = 0; i < cum.length; i++) {
          if (tMs < cum[i]) {
            idx = i;
            break;
          }
        }
        if (idx !== lastIdx) {
          lastIdx = idx;
          setPhaseIdx(idx);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, phases.length]);

  return phaseIdx;
}
