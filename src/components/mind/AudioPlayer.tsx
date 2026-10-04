"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { rangeFill } from "@/lib/ui/range";
import { Pause, Play } from "lucide-react";
import { ICON } from "@/components/ui/icon";

/**
 * Minimal HTML5 audio player for mental sessions (B-layer voice-agnostic).
 *
 * Renders only when the parent passes a non-null `src`. Custom skin
 * matches the dark editorial design — no native `<audio controls>`
 * widget. Tap-to-play/pause + scrubber + tabular-time display.
 *
 * Voice-source agnostic: works for Munk-recorded files, ElevenLabs TTS,
 * any future `mental_sessions.audio_url`. When voice decision lands, the
 * only change needed is which URL goes into the column.
 *
 * Falls back silently to nothing on load error — text+ring continues
 * to be the always-available default.
 */
export default function AudioPlayer({ src, durationSeconds }: { src: string; durationSeconds: number }) {
  const t = useTranslations("Mind.audio");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [actualDuration, setActualDuration] = useState(durationSeconds);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTime = () => setCurrentTime(el.currentTime);
    const onLoaded = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setActualDuration(el.duration);
      }
    };
    const onEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setErrored(true);
      setPlaying(false);
    };

    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, []);

  function toggle() {
    const el = audioRef.current;
    if (!el || errored) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(
        () => setPlaying(true),
        (e) => {
          console.warn("[mind/audio] play failed", e);
          setErrored(true);
        },
      );
    }
  }

  function scrub(e: React.ChangeEvent<HTMLInputElement>) {
    const el = audioRef.current;
    const next = Number(e.target.value);
    setCurrentTime(next);
    if (el) el.currentTime = next;
  }

  // Errored: hide silently. Parent's text+ring covers the experience.
  if (errored) return null;

  return (
    <div className="flex items-center gap-4 border hairline bg-bg-2/40 px-4 py-2.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pause") : t("play")}
        className="size-9 rounded-full bg-fg text-bg flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
      >
        {playing ? (
          <Pause {...ICON} className="size-4" />
        ) : (
          <Play {...ICON} className="size-4" />
        )}
      </button>

      <input
        type="range"
        min={0}
        max={actualDuration}
        step={0.1}
        value={currentTime}
        onChange={scrub}
        aria-label={t("seek")}
        className="range flex-1"
        style={rangeFill(currentTime, 0, actualDuration)}
      />

      <span className="text-fg-dim text-micro tabular-nums shrink-0 w-16 text-right">
        {formatSeconds(currentTime)} / {formatSeconds(actualDuration)}
      </span>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}

function formatSeconds(s: number): string {
  const total = Math.max(0, Math.floor(s));
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}
