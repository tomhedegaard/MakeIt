"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { dismissTierEventAction } from "@/app/(app)/actions";
import { X } from "lucide-react";
import { ICON } from "@/components/ui/icon";

export default function TierBanner({
  eventId,
  toTier,
  fromTier,
}: {
  eventId: string;
  toTier: string;
  fromTier: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();
  const t = useTranslations("Nav.tierBanner");

  function dismiss() {
    setHidden(true);
    startTransition(() => {
      dismissTierEventAction(eventId);
    });
  }

  if (hidden) return null;

  return (
    <div
      className="surface-2 rounded-2xl px-5 py-4 flex items-center gap-4 lift"
      style={{ borderColor: "var(--line-bright)" }}
    >
      <span className="pulse-dot" aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="text-micro text-fg-faint mb-0.5">
          {t("eyebrow")}
        </div>
        <div className="font-display text-card leading-snug">
          {t("title", { fromTier, toTier })}
        </div>
        <div className="text-micro text-fg-dim mt-0.5">
          {t("subtitle")}
        </div>
      </div>
      <Link href="/reps" className="btn btn-sm btn-primary shrink-0">
        {t("cta")}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t("close")}
        className="size-11 flex items-center justify-center text-fg-dim hover:text-fg shrink-0"
      >
        <X {...ICON} className="size-4" />
      </button>
    </div>
  );
}
