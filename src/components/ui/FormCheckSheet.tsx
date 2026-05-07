"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import {
  analyzeFormCheckAction,
  attachFormCheckVideoAction,
} from "@/app/(app)/form-check/actions";
import { createClient as createBrowserSupabase } from "@/lib/supabase/client";

const FORM_CHECK_BUCKET = "form-check-videos";

type Step = "choose" | "uploading" | "analyzing" | "result";

type AIVerdict = {
  score: number;
  headline: string;
  pos: string[];
  neg: string[];
  fix: string;
};

const VERDICTS: Record<string, AIVerdict> = {
  "back squat": {
    score: 84,
    headline: "Solid sæt — let knæ-valgus i hullet",
    pos: [
      "Bardepth ramt — hofte under knæ på alle 3 reps",
      "Konsistent bar-path lige over midtfod",
      "God spinal kontrol gennem hele sættet",
    ],
    neg: [
      "Højre knæ kollapser let indad på rep 2 og 3",
      "Tempo accelererer ud af hullet — mister tension",
    ],
    fix:
      "Driv knæene aktivt udad i bunden (\"spread the floor\"). " +
      "Hold 1 sek pause i bunden næste sæt for at genopbygge tension.",
  },
  "deadlift": {
    score: 79,
    headline: "Stærkt løft — hyperekstension på toppen",
    pos: [
      "Bar holder kontakt med kroppen hele vejen op",
      "Bagdel og lats engageret fra setup",
      "God pace — ingen tøven ved knæene",
    ],
    neg: [
      "Hyperextension i lock-out (læn dig 5° tilbage)",
      "Hofte stiger marginalt før skuldrene",
    ],
    fix:
      "Lås ud med squeeze i baller, ikke ved at læne tilbage. " +
      "Tænk \"stå op\" frem for \"læn tilbage\" på toppen.",
  },
  default: {
    score: 81,
    headline: "Teknisk solidt — to mindre justeringer",
    pos: [
      "God kontrol over hele bevægelsen",
      "Konsistent ROM (range of motion) på alle reps",
      "Tempo matcher programmets foreskrevne",
    ],
    neg: [
      "Let asymmetri mellem venstre og højre side",
      "Bar-path drifter en smule fremad i excentrisk fase",
    ],
    fix:
      "Filmoptag fra siden næste gang for at validere bar-path. " +
      "Overvej en deload-sæt på den svage side næste session.",
  },
};

function pickVerdict(exerciseName?: string): AIVerdict {
  if (!exerciseName) return VERDICTS.default;
  const key = exerciseName.toLowerCase();
  return VERDICTS[key] ?? VERDICTS.default;
}

export default function FormCheckSheet({
  open,
  onOpenChange,
  exerciseName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exerciseName?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Body mounts only while open — state is fresh each session. */}
      {open ? (
        <FormCheckBody exerciseName={exerciseName} onClose={() => onOpenChange(false)} />
      ) : null}
    </Sheet>
  );
}

function FormCheckBody({
  exerciseName,
  onClose,
}: {
  exerciseName?: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<Step>("choose");
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<AIVerdict | null>(null);
  const [isMockResult, setIsMockResult] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

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
      setVerdict(pickVerdict(exerciseName));
      setStep("result");
      return;
    }

    resetProgress();
    setStep("analyzing");

    // 2. Server action: Claude vision (or null if not configured)
    let formCheckId: string | null = null;
    try {
      const res = await analyzeFormCheckAction({ frames, exerciseName });
      if (res.ok && res.verdict) {
        setIsMockResult(false);
        setVerdict({
          score: res.verdict.score,
          headline: res.verdict.headline,
          pos: res.verdict.pos,
          neg: res.verdict.neg,
          fix: res.verdict.fix,
        });
        setStep("result");
        formCheckId = res.formCheckId;
      } else {
        setIsMockResult(true);
        setVerdict(pickVerdict(exerciseName));
        setStep("result");
      }
    } catch (err) {
      console.warn("[form-check] action failed:", err);
      setIsMockResult(true);
      setVerdict(pickVerdict(exerciseName));
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
      setVerdict(pickVerdict(exerciseName));
      setStep("result");
    }, 2200);
  }

  return (
    <SheetContent>
        {step === "choose" ? (
          <div>
            <div className="eyebrow mb-2">Form-check</div>
            <h2 className="font-display text-3xl mb-1">
              Optag eller upload din video.
            </h2>
            <p className="text-fg-dim text-sm mb-6">
              {exerciseName
                ? `Vores AI tjekker dybde, bar-path og bevægelseskvalitet på ${exerciseName.toLowerCase()} — og en head coach gennemgår alt ugentligt.`
                : "Vores AI tjekker dybde, bar-path og bevægelseskvalitet på din øvelse."}
            </p>

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
                  <div className="font-display text-lg">Optag nu</div>
                </div>
                <div className="text-fg-dim text-sm">Brug kameraet til at filme dit næste sæt.</div>
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
                  <div className="font-display text-lg">Upload fra galleri</div>
                </div>
                <div className="text-fg-dim text-sm">Vælg en eksisterende klip fra din telefon.</div>
              </button>

              <button
                type="button"
                className="surface-2 rounded-2xl p-5 text-left lift touch-app"
                onClick={runDemo}
              >
                <div className="flex items-center gap-3 mb-1">
                  <SparkIcon />
                  <div className="font-display text-lg">Demo med eksempelvideo</div>
                </div>
                <div className="text-fg-dim text-sm">
                  Spring upload over og se AI-svaret med det samme.
                </div>
              </button>
            </div>
          </div>
        ) : null}

        {step === "uploading" || step === "analyzing" ? (
          <div className="py-2">
            <div className="eyebrow mb-2">
              {step === "uploading" ? "Uploader" : "Analyserer"}
            </div>
            <h2 className="font-display text-3xl mb-1">
              {step === "uploading" ? "Sender video op." : "AI kigger på din teknik."}
            </h2>
            <p className="text-fg-dim text-sm mb-6">
              {step === "uploading"
                ? `${fileName ?? "Video"} · krypteret upload`
                : "Måler dybde, knæ-vinkel, hofte-shift og bar-path. ~ 6 sek."}
            </p>

            <ProgressLine value={progress} />

            <ul className="mt-6 space-y-2 text-sm">
              <Step active={step === "uploading"} done={step === "analyzing"}>
                Upload video
              </Step>
              <Step active={step === "analyzing"} done={false}>
                AI-analyse: dybde · bar-path · tempo
              </Step>
              <Step active={false} done={false}>
                Resultat klar
              </Step>
            </ul>
          </div>
        ) : null}

        {step === "result" && verdict ? (
          <div>
            <div className="flex items-end justify-between mb-3">
              <div>
                <div className="eyebrow mb-1">AI form-check</div>
                <h2 className="font-display text-3xl leading-[1]">
                  {verdict.headline}
                </h2>
              </div>
              <div className="text-right shrink-0">
                <div className="numeric text-5xl">{verdict.score}</div>
                <div className="eyebrow">/ 100</div>
              </div>
            </div>

            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint mb-5">
              {isMockResult
                ? "Demo-svar · ægte AI aktiveres med ANTHROPIC_API_KEY"
                : "AI-vurdering · godkendes af head coach inden for 24t"}
            </p>

            <div className="space-y-3">
              <Card title="Hvad du gjorde rigtigt" items={verdict.pos} kind="pos" />
              <Card title="Hvor du kan stramme op" items={verdict.neg} kind="neg" />
              <div className="surface-2 rounded-lg p-4">
                <div className="eyebrow mb-2">Coach-tip</div>
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
                Ny optagelse
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
              >
                Færdig
              </button>
            </div>

            <p className="mt-4 text-xs font-mono text-fg-faint text-center">
              Sendes også til din coach for ugentlig review.
            </p>
          </div>
        ) : null}
      </SheetContent>
  );
}

/* --- internal bits --- */

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
