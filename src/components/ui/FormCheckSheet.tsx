"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import {
  analyzeFormCheckAction,
  attachFormCheckVideoAction,
} from "@/app/(app)/form-check/actions";
import {
  createFormQueueItem,
  type FormQueueItem,
} from "@/lib/form-queue/queue";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";
import { describeReset, type FormCheckQuota } from "@/lib/data/form-check-quota";

const FORM_CHECK_BUCKET = "form-check-videos";

type Step = "choose" | "uploading" | "analyzing" | "result";

type AIVerdict = {
  score: number;
  headline: string;
  pos: string[];
  neg: string[];
  fix: string;
};

/** Numeric scores for the demo verdicts — locale-independent. */
const VERDICT_SCORES: Record<string, number> = {
  "back squat": 84,
  deadlift: 79,
  default: 81,
};

/** Resolve the demo-verdict key for an exercise name. */
function pickVerdictKey(exerciseName?: string): string {
  if (!exerciseName) return "default";
  const key = exerciseName.toLowerCase();
  return key in VERDICT_SCORES ? key : "default";
}

export type FormCheckExerciseContext = {
  exerciseId?: string;
  cues?: string[];
  mistakes?: { title: string; body: string }[];
  sessionId?: string;
  setIndex?: number;
  setId?: string;
  memberId?: string;
  memberHandle?: string;
};

export default function FormCheckSheet({
  open,
  onOpenChange,
  exerciseName,
  context,
  quota,
  onQueued,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exerciseName?: string;
  context?: FormCheckExerciseContext;
  quota?: FormCheckQuota;
  onQueued?: (item: FormQueueItem) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Body mounts only while open — state is fresh each session. */}
      {open ? (
        <FormCheckBody
          exerciseName={exerciseName}
          context={context}
          quota={quota}
          onClose={() => onOpenChange(false)}
          onQueued={onQueued}
        />
      ) : null}
    </Sheet>
  );
}

function FormCheckBody({
  exerciseName,
  context,
  quota,
  onClose,
  onQueued,
}: {
  exerciseName?: string;
  context?: FormCheckExerciseContext;
  quota?: FormCheckQuota;
  onClose: () => void;
  onQueued?: (item: FormQueueItem) => void;
}) {
  const t = useTranslations("FormCheck");
  const [step, setStep] = useState<Step>("choose");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<AIVerdict | null>(null);
  const [isMockResult, setIsMockResult] = useState(false);
  // Locked into the upgrade-CTA path. Set from the quota prop on mount,
  // or from a server-side rejection mid-flow (race condition).
  const [quotaBlocked, setQuotaBlocked] = useState(
    quota ? !quota.hasRemaining : false,
  );
  const fileRef = useRef<HTMLInputElement | null>(null);

  /** Build a localized demo verdict for the given exercise name. */
  function enqueue(verdict: AIVerdict) {
    if (!onQueued) return;
    onQueued(
      createFormQueueItem({
        memberId: context?.memberId ?? "mock-munk",
        memberHandle: context?.memberHandle ?? "Munk",
        exerciseName: exerciseName ?? "Form-check",
        setIndex: context?.setIndex ?? 1,
        sessionId: context?.sessionId ?? null,
        aiScore: verdict.score,
        aiHeadline: verdict.headline,
        aiPos: verdict.pos,
        aiNeg: verdict.neg,
        aiFix: verdict.fix,
      }),
    );
  }

  function pickVerdict(name?: string): AIVerdict {
    const key = pickVerdictKey(name);
    return {
      score: VERDICT_SCORES[key],
      headline: t(`verdicts.${key}.headline`),
      pos: t.raw(`verdicts.${key}.pos`) as string[],
      neg: t.raw(`verdicts.${key}.neg`) as string[],
      fix: t(`verdicts.${key}.fix`),
    };
  }

  // Indeterminate-style progress for the upload + analyzing phases.
  // Real work (frame extraction + Claude call) is async and finishes
  // when the action returns; this just provides visual continuity.
  useEffect(() => {
    if (step !== "uploading" && step !== "analyzing") return;
    let p = 0;
    const cap = step === "analyzing" ? 92 : 95;
    const speed = step === "uploading" ? 8 : 1.2;
    const tick = step === "uploading" ? 100 : 180;
    const id = window.setInterval(() => {
      p = Math.min(cap, p + speed);
      setProgress(p);
    }, tick);
    return () => clearInterval(id);
  }, [step]);

  // Reset progress in the click handlers (not via effect) when entering
  // upload/analyse phases — keeps the effect free of setState.
  function resetProgress() {
    setProgress(0);
  }

  async function pickFile(file: File) {
    setFileName(file.name);
    resetProgress();
    setStep("uploading");

    // Kick off video upload in parallel with frame extraction. The
    // upload typically takes 5-30s depending on file size; we don't
    // want it on the critical path of showing the verdict.
    const uploadPromise = uploadVideoToStorage(file).catch((err) => {
      console.warn("[form-check] upload failed (non-fatal):", err);
      return null;
    });

    // 1. Extract 3 keyframes via canvas (no server-side ffmpeg needed)
    let frames: string[] = [];
    try {
      frames = await extractKeyframes(file, 3, 1024);
    } catch (err) {
      console.warn("[form-check] extraction failed:", err);
      setIsMockResult(true);
      const fallback = pickVerdict(exerciseName);
      setVerdict(fallback);
      enqueue(fallback);
      setStep("result");
      return;
    }

    resetProgress();
    setStep("analyzing");

    // 2. Server action: Claude vision (or null if not configured)
    let formCheckId: string | null = null;
    try {
      const res = await analyzeFormCheckAction({
        frames,
        exerciseName,
        exerciseId: context?.exerciseId,
        setIndex: context?.setIndex,
        sessionId: context?.sessionId,
        context:
          context?.cues || context?.mistakes
            ? { cues: context.cues, mistakes: context.mistakes }
            : undefined,
      });
      if (res.ok && res.verdict) {
        setIsMockResult(false);
        const next = {
          score: res.verdict.score,
          headline: res.verdict.headline,
          pos: res.verdict.pos,
          neg: res.verdict.neg,
          fix: res.verdict.fix,
        };
        setVerdict(next);
        enqueue(next);
        setStep("result");
        formCheckId = res.formCheckId;
      } else if (res.quotaExceeded) {
        // Race: client thought quota was OK, server says no. Bounce
        // back to choose-step with the upgrade CTA visible.
        setQuotaBlocked(true);
        setStep("choose");
      } else {
        setIsMockResult(true);
        const fallback = pickVerdict(exerciseName);
        setVerdict(fallback);
        enqueue(fallback);
        setStep("result");
      }
    } catch (err) {
      console.warn("[form-check] action failed:", err);
      setIsMockResult(true);
      const fallback = pickVerdict(exerciseName);
      setVerdict(fallback);
      enqueue(fallback);
      setStep("result");
    }

    // 3. Attach the uploaded video to the form_check row as soon as the
    //    upload finishes. Fire-and-forget — verdict is already shown.
    if (formCheckId) {
      uploadPromise.then((videoPath) => {
        if (videoPath) {
          attachFormCheckVideoAction({ formCheckId, videoPath }).catch(() => {});
        }
      });
    }
  }

  function runDemo() {
    // No real frames — straight-to-mock with progress simulation
    setFileName("squat-set-3.mov");
    setIsMockResult(true);
    resetProgress();
    setStep("uploading");
    window.setTimeout(() => {
      resetProgress();
      setStep("analyzing");
    }, 700);
    window.setTimeout(() => {
      const fallback = pickVerdict(exerciseName);
      setVerdict(fallback);
      enqueue(fallback);
      setStep("result");
    }, 2200);
  }

  return (
    <SheetContent>
        {step === "choose" ? (
          <div>
            <div className="eyebrow mb-2">{t("eyebrow")}</div>
            <h2 className="font-display text-3xl mb-1">
              {quotaBlocked ? t("choose.titleBlocked") : t("choose.title")}
            </h2>
            <p className="text-fg-dim text-sm mb-4">
              {quotaBlocked
                ? t("choose.descriptionBlocked")
                : exerciseName
                ? t("choose.descriptionExercise", {
                    exercise: exerciseName.toLowerCase(),
                    set: context?.setIndex ?? 1,
                  })
                : t("choose.descriptionDefault")}
            </p>

            {quota ? (
              <QuotaLine quota={quota} blocked={quotaBlocked} t={t} />
            ) : null}

            {quotaBlocked ? (
              <UpgradeCta t={t} />
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="video/*"
                  capture="environment"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) pickFile(f);
                  }}
                />

                <div className="grid gap-3">
                  <button
                    type="button"
                    className="surface-2 rounded-2xl p-5 text-left lift touch-app"
                    onClick={() => {
                      if (fileRef.current) {
                        fileRef.current.setAttribute("capture", "environment");
                        fileRef.current.click();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <CameraIcon />
                      <div className="font-display text-lg">{t("choose.recordNow")}</div>
                    </div>
                    <div className="text-fg-dim text-sm">{t("choose.recordNowSub")}</div>
                  </button>

                  <button
                    type="button"
                    className="surface-2 rounded-2xl p-5 text-left lift touch-app"
                    onClick={() => {
                      if (fileRef.current) {
                        fileRef.current.removeAttribute("capture");
                        fileRef.current.click();
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <UploadIcon />
                      <div className="font-display text-lg">{t("choose.uploadGallery")}</div>
                    </div>
                    <div className="text-fg-dim text-sm">{t("choose.uploadGallerySub")}</div>
                  </button>

                  <button
                    type="button"
                    className="surface-2 rounded-2xl p-5 text-left lift touch-app"
                    onClick={runDemo}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <SparkIcon />
                      <div className="font-display text-lg">{t("choose.demo")}</div>
                    </div>
                    <div className="text-fg-dim text-sm">
                      {t("choose.demoSub")}
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        {step === "uploading" || step === "analyzing" ? (
          <div className="py-2">
            <div className="eyebrow mb-2">
              {step === "uploading"
                ? t("progress.uploadingEyebrow")
                : t("progress.analyzingEyebrow")}
            </div>
            <h2 className="font-display text-3xl mb-1">
              {step === "uploading"
                ? t("progress.uploadingTitle")
                : t("progress.analyzingTitle")}
            </h2>
            <p className="text-fg-dim text-sm mb-6">
              {step === "uploading"
                ? t("progress.uploadingSub", {
                    fileName: fileName ?? t("progress.videoFallback"),
                  })
                : t("progress.analyzingSub")}
            </p>

            <ProgressLine value={progress} />

            <ul className="mt-6 space-y-2 text-sm">
              <Step active={step === "uploading"} done={step === "analyzing"}>
                {t("progress.stepUpload")}
              </Step>
              <Step active={step === "analyzing"} done={false}>
                {t("progress.stepAnalyze")}
              </Step>
              <Step active={false} done={false}>
                {t("progress.stepResult")}
              </Step>
            </ul>
          </div>
        ) : null}

        {step === "result" && verdict ? (
          <div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="eyebrow mb-1">{t("result.eyebrow")}</div>
                <h2 className="font-display text-3xl leading-[1]">
                  {verdict.headline}
                </h2>
              </div>
              <div className="text-right shrink-0">
                <div className="numeric text-5xl">{verdict.score}</div>
                <div className="eyebrow">{t("result.outOf")}</div>
              </div>
            </div>

            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint mb-5">
              {isMockResult
                ? t("result.mockNote")
                : t("result.realNote")}
            </p>

            <div className="space-y-3">
              <Card title={t("result.cardPos")} items={verdict.pos} kind="pos" />
              <Card title={t("result.cardNeg")} items={verdict.neg} kind="neg" />
              <div className="surface-2 rounded-lg p-4">
                <div className="eyebrow mb-2">{t("result.coachTip")}</div>
                <p className="text-sm text-fg/90 leading-relaxed">{verdict.fix}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setStep("choose");
                }}
              >
                {t("result.newRecording")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                {t("result.done")}
              </button>
            </div>

            <p className="mt-4 text-xs font-mono text-fg-faint text-center">
              {t("result.coachReviewNote")}
            </p>
          </div>
        ) : null}
      </SheetContent>
  );
}

/* --- internal bits --- */

function QuotaLine({
  quota,
  blocked,
  t,
}: {
  quota: FormCheckQuota;
  blocked: boolean;
  t: ReturnType<typeof useTranslations<"FormCheck">>;
}) {
  // Legend / unlimited tiers hide the counter — no anxiety needed.
  if (quota.limit >= 999) return null;
  return (
    <div
      className={cn(
        "mb-6 px-3 py-2 rounded-lg surface text-xs font-mono uppercase tracking-[0.14em] flex items-center justify-between gap-3",
        blocked ? "text-fg" : "text-fg-dim",
      )}
    >
      <span>
        {t("quota.used", { used: quota.used, limit: quota.limit })}
      </span>
      <span className="text-fg-faint normal-case tracking-normal">
        {describeReset(quota.resetsAt)}
      </span>
    </div>
  );
}

function UpgradeCta({
  t,
}: {
  t: ReturnType<typeof useTranslations<"FormCheck">>;
}) {
  return (
    <div className="space-y-3">
      <Link
        href="/reps"
        className="surface-2 rounded-2xl p-5 block lift touch-app"
      >
        <div className="flex items-center gap-3 mb-1">
          <SparkIcon />
          <div className="font-display text-lg">{t("upgrade.title")}</div>
        </div>
        <div className="text-fg-dim text-sm">
          {t("upgrade.body")}
        </div>
      </Link>
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint text-center">
        {t("upgrade.orWait")}
      </div>
    </div>
  );
}

function ProgressLine({ value }: { value: number }) {
  return (
    <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
      <div
        className="h-full bg-fg transition-all"
        style={{ width: `${value}%`, transitionDuration: "180ms" }}
      />
    </div>
  );
}

function Step({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "size-5 rounded-full border flex items-center justify-center text-[10px]",
          done
            ? "bg-fg text-bg border-fg"
            : active
              ? "border-fg text-fg"
              : "border-line-strong text-fg-faint"
        )}
        aria-hidden
      >
        {done ? "✓" : active ? "·" : ""}
      </span>
      <span className={cn(active || done ? "text-fg" : "text-fg-faint")}>{children}</span>
    </li>
  );
}

function Card({
  title,
  items,
  kind,
}: {
  title: string;
  items: string[];
  kind: "pos" | "neg";
}) {
  return (
    <div className="surface-2 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="eyebrow">{title}</div>
        <span
          className={cn(
            "text-[10px] font-mono uppercase tracking-[0.14em] rounded-full px-2 py-0.5 border",
            kind === "pos" ? "border-line-strong text-fg" : "border-line-strong text-fg-dim"
          )}
        >
          {kind === "pos" ? "+" : "△"}
        </span>
      </div>
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

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
      <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
      <path d="M12 16V5m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5 16v3h14v-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
      <path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M5.6 18.4l4.2-4.2M14.2 9.8l4.2-4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------------------------------------------------------- *
 * Keyframe extraction (browser-side, no ffmpeg needed)
 * ---------------------------------------------------------------- */

/**
 * Read a video File and return N evenly-spaced JPEG frames as
 * data URLs (data:image/jpeg;base64,...). Frames are downscaled so
 * the long edge ≤ maxDim, keeping the action payload small.
 */
async function extractKeyframes(
  file: File,
  count = 3,
  maxDim = 1024
): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    video.onloadedmetadata = async () => {
      try {
        const duration = video.duration;
        if (!isFinite(duration) || duration <= 0) {
          throw new Error("Invalid video duration");
        }

        // Spread frames between 15% and 85% of duration to skip blank
        // start/end frames common in mobile recordings.
        const ts = Array.from({ length: count }, (_, i) => {
          const f = count === 1 ? 0.5 : 0.15 + (0.7 * i) / (count - 1);
          return duration * f;
        });

        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) throw new Error("Video has no dimensions");
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2d context unavailable");

        const frames: string[] = [];
        for (const t of ts) {
          await seekVideo(video, t);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          frames.push(canvas.toDataURL("image/jpeg", 0.7));
        }

        URL.revokeObjectURL(url);
        resolve(frames);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load video"));
    };

    video.src = url;
  });
}

function seekVideo(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      // Small delay lets Safari finalise the frame paint.
      window.setTimeout(resolve, 30);
    };
    video.addEventListener("seeked", onSeeked);
    video.currentTime = t;
  });
}

/* ---------------------------------------------------------------- *
 * Supabase Storage upload (browser-side)
 * Uploads to form-check-videos/<auth.uid()>/<id>.<ext>. RLS scopes
 * writes to the authed user's own folder. Returns the storage path
 * (relative to bucket root) on success, null otherwise.
 * ---------------------------------------------------------------- */
async function uploadVideoToStorage(file: File): Promise<string | null> {
  const supabase = createBrowserSupabase();
  if (!supabase) return null; // demo mode — no storage

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (!file.type.startsWith("video/")) return null;
  if (file.size > 100 * 1024 * 1024) return null; // 100 MB ceiling

  const ext = (file.name.split(".").pop() ?? "mp4")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 6) || "mp4";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `${user.id}/${stamp}-${rand}.${ext}`;

  const { error } = await supabase.storage
    .from(FORM_CHECK_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "video/mp4",
      upsert: false,
    });

  if (error) {
    console.warn("[form-check] storage upload failed:", error.message);
    return null;
  }

  return path;
}
