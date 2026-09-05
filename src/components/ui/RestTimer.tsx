"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("Session.restTimer");

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
      className="surface-2 rounded-2xl px-4 py-3 sm:px-5 sm:py-4 flex items-center gap-3 sm:gap-4"
      role="timer"
      aria-label={t("ariaLabel")}
    >
      <div className="relative size-12 sm:size-14 shrink-0">
        <svg viewBox="0 0 36 36" className="size-full -rotate-90">
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
        <div className="eyebrow mb-0.5">{t("title")}</div>
        <div className="text-sm text-fg-dim leading-snug">
          {t("description", { time: fmt(left) })}
        </div>
      </div>

      <button type="button" className="btn btn-sm shrink-0" onClick={onSkip}>
        {t("skip")}
      </button>
    </div>
  );
}
