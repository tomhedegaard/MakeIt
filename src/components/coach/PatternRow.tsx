"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { track, TELEMETRY } from "@/lib/telemetry";
import type { PatternForDisplay } from "@/lib/data/coach-patterns";

/**
 * One cohort-pattern card on /coach/patterns (MM-8).
 *
 * Spec: docs/superpowers/specs/2026-05-26-munk-multiplier-v0-design.md §3 (MM-3 on-demand), §8
 *
 * Collapsed by default — shows code chip, summary, and affected count.
 * Click expands inline to list affected members (handles linked to
 * /coach/members/[id]). Fires `coach_pattern_drilled_in` once per row
 * per page render (first expansion), so the metric reflects unique
 * drill-ins, not re-toggles.
 */
export default function PatternRow({ pattern }: { pattern: PatternForDisplay }) {
  const t = useTranslations("Coach.patterns");
  const [open, setOpen] = useState(false);
  const firedRef = useRef(false);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !firedRef.current) {
      track(TELEMETRY.coachPatternDrilledIn, {
        pattern_code: pattern.code,
        affected_count: pattern.affected.length,
      });
      firedRef.current = true;
    }
  }

  const codeLabel = t(`codes.${pattern.code}`);

  return (
    <div className="surface rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="w-full text-left p-4 hover:bg-bg-3 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full surface-2 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
                {codeLabel}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
                {t("affectedCount", { count: pattern.affected.length })}
              </span>
            </div>
            <p className="text-sm text-fg leading-relaxed">{pattern.summaryDa}</p>
          </div>
          <span
            aria-hidden="true"
            className="shrink-0 text-fg-faint font-mono text-xs"
          >
            {open ? "−" : "+"}
          </span>
        </div>
      </button>

      {open ? (
        <div className="border-t hairline px-4 py-3 space-y-2">
          <div className="eyebrow">{t("drillInHeader")}</div>
          <ul className="flex flex-wrap gap-2">
            {pattern.affected.map((m) => (
              <li key={m.memberId}>
                <Link
                  href={`/coach/members/${m.memberId}`}
                  className="inline-flex items-center rounded-full surface-2 px-3 py-1 text-xs text-fg hover:bg-bg-3 transition-colors"
                >
                  @{m.handle}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
