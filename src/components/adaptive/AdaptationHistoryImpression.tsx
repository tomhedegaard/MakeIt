"use client";

import { useEffect, useRef } from "react";

import { TELEMETRY, track } from "@/lib/telemetry";

type Props = {
  recentCount: number;
};

/**
 * Tiny client component whose only job is to fire the
 * `adaptive_history_viewed` telemetry event once per page load.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §8
 *
 * v0 simplification: "viewed" = "rendered into the React tree".
 * Full-page IntersectionObserver-based impression tracking is a v1
 * refinement if the dashboard needs viewport-actual visibility.
 *
 * useRef guards against StrictMode double-mount in dev so the event
 * only fires once per real navigation, not per re-render.
 */
export default function AdaptationHistoryImpression({ recentCount }: Props) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    track(TELEMETRY.adaptiveHistoryViewed, { recent_count: recentCount });
  }, [recentCount]);
  return null;
}
