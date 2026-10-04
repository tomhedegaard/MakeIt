"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
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
export default function HrvAlertCard({
  alert,
  showHeader = true,
}: {
  alert: HrvAlertRow;
  /** False inside the inbox panel, which already shows @handle + time. */
  showHeader?: boolean;
}) {
  const t = useTranslations("Coach.hrvAlert");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  const { conditionsMet } = alert;
  const consecutiveDaysLow =
    conditionsMet.sustained_low_readiness?.consecutive_days_low ?? 0;
  const deltaPct = conditionsMet.rhr_spike?.delta_pct ?? null;
  const lifestyleFlags = conditionsMet.lifestyle_flags ?? {
    sick: false,
    stressed: false,
    short_sleep: false,
    high_alcohol: false,
  };
  const lifestyleAny =
    lifestyleFlags.sick ||
    lifestyleFlags.stressed ||
    lifestyleFlags.short_sleep ||
    lifestyleFlags.high_alcohol;

  function sendNote() {
    if (pending) return;
    startTransition(async () => {
      const res = await sendHrvAlertNoteAction(alert.id, notes);
      if (res.ok) {
        setOpen(false);
        setNotes("");
      }
    });
  }

  function markSeen() {
    if (pending) return;
    startTransition(async () => {
      await markHrvAlertSeenAction(alert.id);
    });
  }

  function suggestPause() {
    if (pending) return;
    startTransition(async () => {
      await pauseSessionFromAlertAction(alert.id);
    });
  }

  return (
    <div className="surface-2 rounded-2xl p-5">
      {showHeader ? (
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="text-copy">
              <Link
                href={`/coach/members/${alert.memberId}`}
                className="hover:underline"
              >
                @{alert.memberHandle}
              </Link>
            </div>
            <div className="text-micro text-fg-faint">
              {new Date(alert.triggeredAt).toLocaleString(locale, {
                hour: "2-digit",
                minute: "2-digit",
                day: "numeric",
                month: "short",
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Condition chips — information only (spec §10). */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {/* Baseline state is a fact either way, so it never renders faint. */}
        <Chip active>
          {conditionsMet.warm_up_active
            ? t("baselineActive")
            : t("baselineBuilding")}
        </Chip>

        {conditionsMet.sustained_low_readiness !== null ? (
          <Chip active={consecutiveDaysLow >= 3}>
            {t("daysLow", { count: consecutiveDaysLow })}
          </Chip>
        ) : null}

        {conditionsMet.rhr_spike !== null && deltaPct !== null ? (
          <Chip active={deltaPct >= 10}>
            {`RHR ${deltaPct >= 0 ? "+" : "−"}${Math.abs(deltaPct)}%`}
          </Chip>
        ) : null}

        <Chip active={lifestyleAny}>{t("lifestyle")}</Chip>
      </div>

      {/* Per-sub-flag truth for lifestyle — render all four, even when
          false, so Munk sees the negative space too. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro mb-4">
        <SubFlag on={lifestyleFlags.sick}>{t("sick")}</SubFlag>
        <span className="text-fg-faint">·</span>
        <SubFlag on={lifestyleFlags.stressed}>{t("stressed")}</SubFlag>
        <span className="text-fg-faint">·</span>
        <SubFlag on={lifestyleFlags.short_sleep}>{t("shortSleep")}</SubFlag>
        <span className="text-fg-faint">·</span>
        <SubFlag on={lifestyleFlags.high_alcohol}>{t("highAlcohol")}</SubFlag>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={markSeen}
          aria-disabled={pending}
        >
          {t("markSeen")}
        </button>
        <button
          type="button"
          className="btn btn-sm"
          onClick={suggestPause}
          aria-disabled={pending}
        >
          {t("suggestPause")}
        </button>

        <Sheet open={open} onOpenChange={setOpen}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => {
              if (!pending) setOpen(true);
            }}
            aria-disabled={pending}
          >
            {t("sendMessage")}
          </button>
          <SheetContent>
            <div className="mb-4">
              <div className="eyebrow mb-1">@{alert.memberHandle}</div>
              <h2 className="font-display text-section">
                {t("sheetTitle")}
              </h2>
            </div>

            <div className="mt-2">
              <label className="block">
                <span className="eyebrow block mb-2">
                  {t("messageTo", { handle: alert.memberHandle })}
                </span>
                <textarea
                  className="field min-h-[140px] py-3 resize-none w-full"
                  placeholder={t("placeholder", { handle: alert.memberHandle })}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1000}
                />
              </label>
              <div className="mt-2 text-micro text-fg-faint text-right">
                {notes.length} / 1000
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (!pending) setOpen(false);
                }}
                aria-disabled={pending}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={sendNote}
                disabled={notes.trim().length < 1}
                aria-disabled={pending}
              >
                {pending ? t("sending") : t("send")}
              </button>
            </div>

            <p className="mt-4 text-meta text-fg-faint text-center">
              {t("sheetFoot")}
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
        "inline-flex items-center border hairline px-2.5 py-1 text-micro",
        active ? "hairline-strong text-fg font-medium" : "text-fg-faint",
      )}
    >
      {children}
    </span>
  );
}

function SubFlag({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span className={cn(on ? "text-fg" : "text-fg-faint")}>{children}</span>
  );
}
