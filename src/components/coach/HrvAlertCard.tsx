"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import {
  markHrvAlertSeenAction,
  pauseSessionFromAlertAction,
  sendHrvAlertNoteAction,
} from "@/app/coach/queue/actions";
import type { HrvAlertRow } from "@/lib/data/coach";
import { cn } from "@/lib/utils";

/**
 * Coach-side card for a single open HRV alert. Renders the
 * `conditions_met` blob as information-only chips (spec §10 — never as
 * advice) plus three one-way actions (spec §8):
 *
 *  - "Markér som set"  → markHrvAlertSeenAction
 *  - "Foreslå pause"   → pauseSessionFromAlertAction
 *  - "Send besked"     → opens Sheet with textarea → sendHrvAlertNoteAction
 *
 * Mirrors `CoachReview.tsx`'s controlled-open Sheet pattern: only the
 * "Send besked" trigger lives inside `<Sheet>`; the other two actions are
 * siblings that never call `setOpen(true)`. A single shared
 * `[pending, startTransition]` disables all three buttons during any
 * in-flight action.
 *
 * Monochrome — no colour accents. Active vs faint chip states are
 * composed with `cn`.
 */
export default function HrvAlertCard({ alert }: { alert: HrvAlertRow }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const { conditionsMet } = alert;
  const consecutiveDaysLow =
    conditionsMet.sustained_low_readiness?.consecutive_days_low ?? 0;
  const deltaPct = conditionsMet.rhr_spike?.delta_pct ?? null;
  const lifestyleAny =
    conditionsMet.lifestyle_flags.sick ||
    conditionsMet.lifestyle_flags.stressed ||
    conditionsMet.lifestyle_flags.short_sleep ||
    conditionsMet.lifestyle_flags.high_alcohol;

  function sendNote() {
    startTransition(async () => {
      const res = await sendHrvAlertNoteAction(alert.id, notes);
      if (res.ok) {
        setOpen(false);
        setNotes("");
      }
    });
  }

  function markSeen() {
    startTransition(async () => {
      await markHrvAlertSeenAction(alert.id);
    });
  }

  function suggestPause() {
    startTransition(async () => {
      await pauseSessionFromAlertAction(alert.id);
    });
  }

  return (
    <div className="surface-2 rounded-2xl p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="min-w-0">
          <div className="text-sm">
            <Link
              href={`/coach/members/${alert.memberId}`}
              className="hover:underline"
            >
              @{alert.memberHandle}
            </Link>
          </div>
          <div className="text-[11px] font-mono text-fg-faint">
            {new Date(alert.triggeredAt).toLocaleString("da-DK", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })}
          </div>
        </div>
      </div>

      {/* Condition chips — information only (spec §10). */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Chip active={conditionsMet.warm_up_active}>Aktiv</Chip>

        {conditionsMet.sustained_low_readiness !== null ? (
          <Chip active={consecutiveDaysLow >= 3}>
            {consecutiveDaysLow} dage lavt
          </Chip>
        ) : null}

        {conditionsMet.rhr_spike !== null && deltaPct !== null ? (
          <Chip active={deltaPct >= 10}>
            {`RHR ${deltaPct >= 0 ? "+" : "−"}${Math.abs(deltaPct)}%`}
          </Chip>
        ) : null}

        <Chip active={lifestyleAny}>Livsstil</Chip>
      </div>

      {/* Per-sub-flag truth for lifestyle — render all four, even when
          false, so Munk sees the negative space too. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono mb-4">
        <SubFlag on={conditionsMet.lifestyle_flags.sick}>syg</SubFlag>
        <span className="text-fg-faint">·</span>
        <SubFlag on={conditionsMet.lifestyle_flags.stressed}>stress</SubFlag>
        <span className="text-fg-faint">·</span>
        <SubFlag on={conditionsMet.lifestyle_flags.short_sleep}>søvn</SubFlag>
        <span className="text-fg-faint">·</span>
        <SubFlag on={conditionsMet.lifestyle_flags.high_alcohol}>alkohol</SubFlag>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={markSeen}
          disabled={pending}
        >
          Markér som set
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={suggestPause}
          disabled={pending}
        >
          Foreslå pause
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setOpen(true)}
            disabled={pending}
          >
            Send besked
          </button>
          <SheetContent>
            <div className="mb-4">
              <div className="eyebrow mb-1">@{alert.memberHandle}</div>
              <h2 className="font-display text-2xl">Send personlig besked</h2>
            </div>

            <div className="mt-2">
              <label className="block">
                <span className="eyebrow block mb-2">
                  Besked til @{alert.memberHandle}
                </span>
                <textarea
                  className="field min-h-[140px] py-3 resize-none w-full"
                  placeholder={`Skriv en personlig besked til @${alert.memberHandle}...`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                />
              </label>
              <div className="mt-2 text-[11px] font-mono text-fg-faint text-right">
                {notes.length} / 1000
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                className="btn"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annullér
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sendNote}
                disabled={pending || notes.trim().length < 1}
              >
                {pending ? "Sender…" : "Send"}
              </button>
            </div>

            <p className="mt-4 text-xs font-mono text-fg-faint text-center">
              Markerer alerten som reviewet og sender beskeden til medlemmet.
            </p>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function Chip({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border hairline px-2.5 py-1 text-[11px] font-mono uppercase tracking-[0.12em]",
        active ? "text-fg font-bold" : "text-fg-faint",
      )}
    >
      {children}
    </span>
  );
}

function SubFlag({
  on,
  children,
}: {
  on: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(on ? "text-fg" : "text-fg-faint")}>{children}</span>
  );
}
