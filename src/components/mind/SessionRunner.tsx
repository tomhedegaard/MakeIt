"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import BreathingRing from "./BreathingRing";
import AudioPlayer from "./AudioPlayer";
import { completeMentalSessionAction } from "@/app/(app)/mind/today/actions";

interface SessionRunnerProps {
  sessionId: string;
  title: string;
  subtitle: string | null;
  bodyMd: string;
  visualPattern:
    | "box_breath_4_4_4_4"
    | "coherence_5_5"
    | "wave_4_8"
    | "still_focus"
    | "none";
  durationSeconds: number;
  /**
   * Optional audio narration URL. When present, an inline player
   * renders above the breathing ring. Voice-source agnostic — any
   * direct-streamable URL works (Supabase Storage, Vercel Blob,
   * external CDN). Null = text+ring only (current default).
   */
  audioUrl?: string | null;
  context?: "library" | "prescribed_by_coach" | "suggested_by_adaptive" | "pre_session" | "post_session";
  alreadyCompleted?: boolean;
}

/**
 * Two-mode renderer for a mental session:
 *
 *  - **Idle**: hero card with title/subtitle + "Start session" CTA.
 *  - **Running**: full-screen overlay with breathing ring + paragraph-paced
 *    typography. Tap "Færdig" or scroll to end → completion action.
 *
 * The body_md is split on H2 (`## `) headings and rendered as discrete
 * paragraphs. No external markdown lib — simple split + render keeps
 * the bundle small and the typography consistent.
 */
export default function SessionRunner({
  sessionId,
  title,
  subtitle,
  bodyMd,
  visualPattern,
  durationSeconds,
  audioUrl = null,
  context = "library",
  alreadyCompleted = false,
}: SessionRunnerProps) {
  const [running, setRunning] = useState(false);
  const [completed, setCompleted] = useState(alreadyCompleted);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const sections = splitMarkdownIntoSections(bodyMd);

  function complete() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("session_id", sessionId);
      fd.set("context", context);
      const res = await completeMentalSessionAction(fd);
      if (res && "error" in res) {
        console.warn("[mind] completion failed", res.error);
      }
      setCompleted(true);
      setRunning(false);
      router.refresh();
    });
  }

  if (!running) {
    return (
      <div className="rounded-2xl border hairline bg-bg-2/40 p-6 md:p-8 space-y-4">
        <div className="eyebrow">Dagens session</div>
        <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
        {subtitle ? <p className="text-fg-dim">{subtitle}</p> : null}
        <p className="text-fg-dim text-sm">
          {Math.round(durationSeconds / 60)} min · {visualPattern.replace(/_/g, " ")}
        </p>
        <div className="pt-2">
          {completed ? (
            <span className="inline-flex items-center gap-2 text-sm text-fg-dim">
              ✓ Gennemført i dag — gå videre.
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setRunning(true)}
              className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity"
            >
              Start session →
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-bg flex flex-col"
    >
      <div className="flex items-center justify-between p-6 border-b hairline">
        <div>
          <div className="eyebrow">Mind · session</div>
          <h2 className="font-display text-xl">{title}</h2>
        </div>
        <button
          type="button"
          onClick={() => setRunning(false)}
          className="text-fg-dim hover:text-fg text-sm"
        >
          Luk
        </button>
      </div>

      <div className="flex-1 grid md:grid-cols-2 gap-8 p-8 overflow-y-auto">
        <div className="flex flex-col items-center justify-center gap-6">
          {audioUrl ? (
            <div className="w-full max-w-md">
              <AudioPlayer src={audioUrl} durationSeconds={durationSeconds} />
            </div>
          ) : null}
          <BreathingRing pattern={visualPattern} />
        </div>
        <div className="space-y-6 max-w-prose">
          {sections.map((sec, i) => (
            <section key={i}>
              {sec.heading ? (
                <h3 className="eyebrow mb-2">{sec.heading}</h3>
              ) : null}
              <p className="text-base md:text-lg leading-relaxed whitespace-pre-wrap">
                {sec.body}
              </p>
            </section>
          ))}
        </div>
      </div>

      <div className="border-t hairline p-6 flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={complete}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-fg text-bg px-7 py-3 text-base font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {pending ? "Gemmer..." : "Færdig — gem"}
        </button>
      </div>
    </div>
  );
}

interface Section {
  heading: string | null;
  body: string;
}

function splitMarkdownIntoSections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+)$/);
    if (heading) {
      if (current) sections.push(current);
      current = { heading: heading[1] ?? null, body: "" };
    } else if (line.startsWith("# ")) {
      // top-level title — skip; the runner already shows it in chrome
      continue;
    } else {
      if (!current) current = { heading: null, body: "" };
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current) sections.push(current);

  return sections
    .map((s) => ({ heading: s.heading, body: s.body.trim() }))
    .filter((s) => s.body.length > 0 || s.heading);
}
