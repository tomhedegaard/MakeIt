"use client";

import { useEffect, useRef, useState } from "react";

function fmt(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RestTimer({
  durationSec,
  onDone,
  onSkip,
}: {
  durationSec: number;
  onDone?: () => void;
  onSkip?: () => void;
}) {
  const [left, setLeft] = useState(() => durationSec);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const start = Date.now();
    ref.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, durationSec - elapsed);
      setLeft(remaining);
      if (remaining === 0) {
        if (ref.current) clearInterval(ref.current);
        onDone?.();
      }
    }, 250);
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [durationSec, onDone]);

  const pct = ((durationSec - left) / durationSec) * 100;

  return (
    <div
      className="surface-2 rounded-2xl px-5 py-4 flex items-center gap-4"
      role="timer"
      aria-label="Hvile"
    >
      <div className="relative size-14 shrink-0">
        <svg viewBox="0 0 36 36" className="size-14 -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" stroke="var(--line)" strokeWidth="2" />
          <circle
            cx="18" cy="18" r="16" fill="none"
            stroke="var(--fg)" strokeWidth="2"
            strokeDasharray={`${(pct / 100) * 100.53} 100.53`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center numeric text-sm">
          {fmt(left)}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="eyebrow mb-0.5">Hvile</div>
        <div className="text-sm text-fg-dim truncate">
          Næste sæt om {fmt(left)} — tag en slurk vand.
        </div>
      </div>

      <button type="button" className="btn btn-sm" onClick={onSkip}>
        Skip
      </button>
    </div>
  );
}
