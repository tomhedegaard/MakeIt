"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Voice-message recorder using the MediaRecorder API.
 *
 * UX:
 *   idle → tap to start (asks mic permission first run)
 *   recording → red dot + counter, tap to stop
 *   preview → playback + send / discard
 *
 * Outputs a Blob via onSubmit; the parent uploads it to Storage and
 * fires the message insert. Caps at 5 minutes to keep file sizes
 * manageable (5 min webm/opus ≈ 2-3 MB).
 *
 * Browser support: solid on Chrome/Edge/Firefox/Safari 14+. Mime
 * type negotiation tries audio/webm;codecs=opus first (smallest),
 * falls back to audio/mp4 on Safari.
 */
export default function AudioRecorder({
  onCancel,
  onSubmit,
  disabled,
}: {
  onCancel: () => void;
  onSubmit: (blob: Blob, durationSec: number, mime: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<{ blob: Blob; mime: string; durationSec: number } | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount: kill stream, revoke any preview URL.
      stopStream();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function pickMime(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
    ];
    for (const c of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) {
        return c;
      }
    }
    return "";
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const durationSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        blobRef.current = { blob, mime: finalMime, durationSec };
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = URL.createObjectURL(blob);
        stopStream();
        setState("preview");
      };
      startedAtRef.current = Date.now();
      recorder.start();
      setState("recording");
      setElapsed(0);
      tickRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(sec);
        if (sec >= 300) stop(); // hard cap at 5 min
      }, 250);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ukendt fejl";
      setError(`Kunne ikke starte optagelse: ${msg}`);
      stopStream();
    }
  }

  function stop() {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  function discard() {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    blobRef.current = null;
    setState("idle");
    setElapsed(0);
    onCancel();
  }

  async function send() {
    if (!blobRef.current || pending) return;
    setPending(true);
    try {
      await onSubmit(blobRef.current.blob, blobRef.current.durationSec, blobRef.current.mime);
      // Let parent dismiss us; we keep state until they unmount.
    } catch {
      setError("Kunne ikke sende — prøv igen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border hairline-strong px-3 py-2 flex items-center gap-3 bg-bg-2">
      {state === "idle" ? (
        <>
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="btn btn-sm btn-primary"
          >
            ● Optag
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-sm btn-ghost"
          >
            Annullér
          </button>
        </>
      ) : null}

      {state === "recording" ? (
        <>
          <span className="size-2.5 rounded-full bg-red-500 animate-pulse" aria-hidden />
          <span className="font-mono text-sm tabular-nums">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-mono text-fg-faint ml-auto">max 5:00</span>
          <button type="button" onClick={stop} className="btn btn-sm">
            ◼ Stop
          </button>
        </>
      ) : null}

      {state === "preview" && previewUrlRef.current ? (
        <>
          <audio src={previewUrlRef.current} controls className="flex-1 max-w-xs" />
          <button
            type="button"
            onClick={discard}
            disabled={pending}
            className="btn btn-sm btn-ghost"
          >
            Slet
          </button>
          <button
            type="button"
            onClick={send}
            disabled={pending}
            className="btn btn-sm btn-primary"
          >
            {pending ? "Sender…" : "Send"}
          </button>
        </>
      ) : null}

      {error ? (
        <span className="text-[10px] font-mono text-red-400 ml-2">{error}</span>
      ) : null}
    </div>
  );
}
