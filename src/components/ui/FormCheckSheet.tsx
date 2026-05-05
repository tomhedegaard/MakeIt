"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";

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
  const fileRef = useRef<HTMLInputElement | null>(null);

  // Mock progress for upload + analyze
  useEffect(() => {
    if (step !== "uploading" && step !== "analyzing") return;
    let p = 0;
    const id = window.setInterval(() => {
      p += step === "uploading" ? 12 : 8;
      setProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(id);
        if (step === "uploading") {
          setStep("analyzing");
          setProgress(0);
        } else if (step === "analyzing") {
          setVerdict(pickVerdict(exerciseName));
          setStep("result");
        }
      }
    }, step === "uploading" ? 90 : 140);
    return () => clearInterval(id);
  }, [step, exerciseName]);

  function pickFile(f: File) {
    setFileName(f.name);
    setStep("uploading");
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
                onClick={() => {
                  // Mock — uses a fake file name and skips real upload
                  setFileName("squat-set-3.mov");
                  setStep("uploading");
                }}
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
              Mock-svar i beta · ægte AI tilkobles før launch
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
