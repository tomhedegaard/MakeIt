"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Live video recorder for chat messages (coach-only at the call
 * site). Mirrors AudioRecorder.tsx but adds a camera preview during
 * recording and a controllable playback after stop.
 *
 * UX:
 *   idle      → tap to grant cam+mic permission and start
 *   recording → live preview + red dot + counter, tap to stop
 *   preview   → playback + send / discard
 *
 * Caps at 5 minutes — keeps file sizes within the bucket's 100 MB
 * ceiling (webm/vp9 at 720p averages ~5-15 MB per minute, so a
 * 5-min recording lands in the 25-75 MB band).
 *
 * MIME negotiation: prefer video/mp4 first (best Safari + iOS
 * compatibility, plays natively in <video>), fall back to webm
 * variants for Chromium where mp4 encoding isn't always available.
 * The bucket's allowed_mime_types covers all of these.
 *
 * Stream cleanup is critical — keeping a camera track alive even
 * for a few seconds shows a recording indicator on macOS/iOS and
 * confuses users; we stop every track on unmount, on stop, and on
 * discard.
 */
export default function VideoRecorder({
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

  // Live camera preview during recording.
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  // Playback after stop.
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  }

  function pickMime(): string {
    // Order: mp4 first (Safari + iOS native), then webm fallbacks
    // for Chromium / Firefox. Some Chrome versions report mp4 as
    // supported but produce no data — MediaRecorder.isTypeSupported
    // is the only correct gate.
    const candidates = [
      "video/mp4;codecs=avc1,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const c of candidates) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(c)
      ) {
        return c;
      }
    }
    return "";
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      // Attach live preview before flipping state so the <video>
      // element exists when we render it.
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
        const finalMime = recorder.mimeType || mime || "video/webm";
        const blob = new Blob(chunksRef.current, { type: finalMime });
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000)
        );
        blobRef.current = { blob, mime: finalMime, durationSec };
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = URL.createObjectURL(blob);
        stopStream();
        setState("preview");
      };

      startedAtRef.current = Date.now();
      recorder.start(1000); // emit a chunk every second so cancel mid-record doesn't lose everything
      setState("recording");
      setElapsed(0);
      tickRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(sec);
        if (sec >= 300) stop(); // hard cap at 5 min
      }, 250);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ukendt fejl";
      // Specific error names worth distinguishing for UX:
      //   NotAllowedError → user denied permission
      //   NotFoundError → no camera/mic on the device
      //   NotReadableError → device is busy (in use by another app)
      if (err instanceof Error && err.name === "NotAllowedError") {
        setError("Tilgang nægtet — tillad kamera + mikrofon i browseren.");
      } else if (err instanceof Error && err.name === "NotFoundError") {
        setError("Intet kamera fundet på enheden.");
      } else if (err instanceof Error && err.name === "NotReadableError") {
        setError("Kamera er optaget af et andet program.");
      } else {
        setError(`Kunne ikke starte optagelse: ${msg}`);
      }
      stopStream();
    }
  }

  // Attach the stream to the live preview <video> after the
  // element mounts. Doing this in render via ref callback would
  // also work, but useEffect keeps the ordering clearer.
  useEffect(() => {
    if (state === "recording" && streamRef.current && liveVideoRef.current) {
      liveVideoRef.current.srcObject = streamRef.current;
      // muted + autoplay so it actually plays on iOS/Safari without
      // any user gesture beyond the start click that triggered us.
      liveVideoRef.current.play().catch(() => {
        // Safari sometimes rejects play() promises; the video still
        // renders the live track so this isn't user-visible.
      });
    }
  }, [state]);

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
      await onSubmit(
        blobRef.current.blob,
        blobRef.current.durationSec,
        blobRef.current.mime
      );
    } catch {
      setError("Kunne ikke sende — prøv igen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border hairline-strong bg-bg-2 p-3 space-y-3">
      {state === "idle" ? (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="btn btn-sm btn-primary"
          >
            ● Optag video
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-sm btn-ghost"
          >
            Annullér
          </button>
          <span className="text-[10px] font-mono text-fg-faint ml-auto">
            max 5:00
          </span>
        </div>
      ) : null}

      {state === "recording" ? (
        <>
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-[280px] mx-auto">
            <video
              ref={liveVideoRef}
              muted
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 rounded-full px-2 py-1">
              <span className="size-2 rounded-full bg-red-500 animate-pulse" aria-hidden />
              <span className="font-mono text-[11px] tabular-nums text-white">
                {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-fg-faint">
              max 5:00
            </span>
            <button
              type="button"
              onClick={stop}
              className="btn btn-sm btn-primary ml-auto"
            >
              ◼ Stop
            </button>
          </div>
        </>
      ) : null}

      {state === "preview" && previewUrlRef.current ? (
        <>
          <video
            ref={playbackVideoRef}
            src={previewUrlRef.current}
            controls
            playsInline
            className="rounded-lg w-full max-h-[280px] mx-auto bg-black"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={discard}
              disabled={pending}
              className="btn btn-sm btn-ghost"
            >
              Slet
            </button>
            <span className="text-[10px] font-mono text-fg-faint">
              {(() => {
                const d = blobRef.current?.durationSec ?? 0;
                return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`;
              })()}
            </span>
            <button
              type="button"
              onClick={send}
              disabled={pending}
              className="btn btn-sm btn-primary ml-auto"
            >
              {pending ? "Sender…" : "Send"}
            </button>
          </div>
        </>
      ) : null}

      {error ? (
        <p className="text-[10px] font-mono text-red-400">{error}</p>
      ) : null}
    </div>
  );
}
