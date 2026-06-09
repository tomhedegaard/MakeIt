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
  // Snapshot phases in a ref so the rAF callback doesn't see a stale
  // closure if phases swap mid-loop (rare, but happens on the spike
  // page where presets change). The cumulative table is derived from
  // this snapshot — also stored in the ref so we don't recompute it
  // every animation frame.
  const phasesRef = useRef(phases);
  const cumulativeRef = useRef<number[]>([]);
  const totalRef = useRef(0);

  useEffect(() => {
    phasesRef.current = phases;
    const cum: number[] = [];
    let running = 0;
    for (const p of phases) {
      running += p.duration_ms;
      cum.push(running);
    }
    cumulativeRef.current = cum;
    totalRef.current = running;
    // Reset reported idx so the next poll fires a fresh onChange even
    // if the new phases produce the same numeric index — protects
    // against stale highlights when the exercise changes.
    setPhaseIdx(null);
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
