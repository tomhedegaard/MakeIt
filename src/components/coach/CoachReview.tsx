"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { reviewFormCheckAction } from "@/app/coach/queue/actions";
import type { FormCheckRow } from "@/lib/data/coach";
import { draftOverlapRatio } from "@/lib/coach/draft-overlap";
import { track, TELEMETRY } from "@/lib/telemetry";
import AudioRecorder from "@/components/chat/AudioRecorder";

export default function CoachReviewButton({
  formCheck,
}: {
  formCheck: FormCheckRow;
}) {
  const t = useTranslations("Coach.review");
  const draft = formCheck.aiDraftedReply;
  const hasDraft = !!draft;
  const [open, setOpen] = useState(false);
  // Pre-fill with Claude's draft so Munk edits inline rather than
  // writing from a blank box (spec §MM-2). Falls back to empty.
  const [notes, setNotes] = useState(draft ?? "");
  const [voiceSec, setVoiceSec] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [pending, startTransition] = useTransition();
  const openedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    openedAtRef.current = Date.now();
    track(TELEMETRY.coachDraftReplyOpened, {
      form_check_id: formCheck.id,
      draft_exists: hasDraft,
    });
  }, [open, formCheck.id, hasDraft]);

  function submit() {
    // Only emit on draft-backed sends so the median edit_ratio stays a
    // clean voice-fidelity signal (spec §8).
    if (hasDraft && draft) {
      const editRatio = 1 - draftOverlapRatio(draft, notes);
      const openedAt = openedAtRef.current;
      track(TELEMETRY.coachDraftReplySent, {
        form_check_id: formCheck.id,
        edit_ratio: Number(editRatio.toFixed(3)),
        send_seconds_since_open:
          openedAt === null ? null : Math.round((Date.now() - openedAt) / 1000),
      });
    }
    startTransition(async () => {
      const res = await reviewFormCheckAction(formCheck.id, notes);
      if (res.ok) {
        setOpen(false);
        setNotes(draft ?? "");
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={() => setOpen(true)}
      >
        {t("open")}
      </button>
      <SheetContent>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="eyebrow mb-1">@{formCheck.memberHandle} · {formCheck.exerciseName ?? t("formCheckFallback")}</div>
            <h2 className="font-display text-2xl">{formCheck.aiHeadline ?? t("aiHeadlineFallback")}</h2>
          </div>
          <div className="text-right shrink-0">
            <div className="numeric text-3xl">{formCheck.aiScore ?? "—"}</div>
            <div className="eyebrow">/ 100</div>
          </div>
        </div>

        {formCheck.videoUrl ? (
          <div className="mb-4 rounded-xl overflow-hidden surface bg-bg-3">
            <video
              src={formCheck.videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[420px] object-contain bg-black"
            />
            <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint border-t hairline">
              {t("signedLink")}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {formCheck.aiPos.length > 0 ? (
            <Card title={t("positives")} items={formCheck.aiPos} />
          ) : null}
          {formCheck.aiNeg.length > 0 ? (
            <Card title={t("negatives")} items={formCheck.aiNeg} />
          ) : null}
          {formCheck.aiFix ? (
            <div className="surface-2 rounded-lg p-4">
              <div className="eyebrow mb-2">{t("aiTip")}</div>
              <p className="text-sm text-fg/90 leading-relaxed">{formCheck.aiFix}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <label className="block">
            <span className="eyebrow mb-2 flex items-center gap-2">
              {hasDraft
                ? t("draftLabel", { handle: formCheck.memberHandle })
                : t("coachNotesLabel", { handle: formCheck.memberHandle })}
              {hasDraft ? (
                <span className="inline-flex items-center rounded-full surface-2 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
                  {t("draftBadge")}
                </span>
              ) : null}
            </span>
            <textarea
              className="field min-h-[100px] py-3 resize-none w-full"
              placeholder={t("coachNotesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="mt-4" data-munk-voice-composer="">
            <div className="eyebrow mb-2">
              {t("voiceLabel", { handle: formCheck.memberHandle })}
            </div>
            <p className="text-xs text-fg-faint mb-2">{t("voiceHint")}</p>
            {voiceSec != null ? (
              <p className="text-sm text-fg-dim" data-munk-voice="">
                {t("voiceReady", { sec: voiceSec })}
              </p>
            ) : recording ? (
              <AudioRecorder
                onCancel={() => setRecording(false)}
                onSubmit={async (_blob, durationSec) => {
                  setVoiceSec(Math.round(durationSec));
                  setRecording(false);
                }}
              />
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setRecording(true)}
              >
                {t("voiceLabel", { handle: formCheck.memberHandle })}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <button
            type="button"
            className="btn"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={pending}
          >
            {pending
              ? t("sending")
              : hasDraft
                ? t("submitDraft", { handle: formCheck.memberHandle })
                : t("submit")}
          </button>
        </div>

        <p className="mt-4 text-xs font-mono text-fg-faint text-center">
          {t("footnote")}
        </p>
      </SheetContent>
    </Sheet>
  );
}

function Card({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="surface-2 rounded-lg p-4">
      <div className="eyebrow mb-2">{title}</div>
      <ul className="space-y-1.5 text-sm text-fg/90">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className="text-fg-faint shrink-0">·</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
