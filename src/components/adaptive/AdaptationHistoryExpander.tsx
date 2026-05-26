"use client";

import { useRef, type ReactNode, type SyntheticEvent } from "react";

import { TELEMETRY, track } from "@/lib/telemetry";

type Props = {
  hiddenCount: number;
  children: ReactNode;
};

/**
 * Client wrapper for the "Vis flere (N)" disclosure in
 * AdaptationHistory. Native <details> for zero-JS state; the
 * client boundary exists only to emit the telemetry event on
 * first open.
 *
 * Spec: docs/superpowers/specs/2026-05-26-open-brain-ui-v0-design.md §8
 *
 * Server-rendered children (the hidden rows) are passed through —
 * keeping AdaptationHistoryRow on the server side so this remains
 * the smallest possible client surface.
 */
export default function AdaptationHistoryExpander({
  hiddenCount,
  children,
}: Props) {
  const firedRef = useRef(false);

  function onToggle(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open || firedRef.current) return;
    firedRef.current = true;
    track(TELEMETRY.adaptiveHistoryExpanded, { expanded_count: hiddenCount });
  }

  return (
    <details className="group/hist" onToggle={onToggle}>
      <summary className="cursor-pointer list-none text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg select-none inline-flex items-center gap-1 lift touch-app">
        <span>Vis flere ({hiddenCount})</span>
        <span
          aria-hidden
          className="group-open/hist:rotate-180 transition-transform"
        >
          ↓
        </span>
      </summary>
      {children}
    </details>
  );
}
