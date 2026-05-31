"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { sendBuddyReactionAction } from "@/app/(app)/buddy/actions";
import type { BuddyInteractionKind } from "@/lib/data/buddy";

/**
 * Three reaction buttons on /buddy. Calls the server action, which
 * inserts a buddy_interactions row gated by RLS. Pending state is
 * tracked per-button via useTransition.
 */
type Reaction = {
  kind: BuddyInteractionKind;
  emoji: string;
  labelKey: string;
};

const REACTIONS: Reaction[] = [
  { kind: "reaction_fire",   emoji: "🔥", labelKey: "reactions.fire" },
  { kind: "reaction_strong", emoji: "💪", labelKey: "reactions.strong" },
  { kind: "reaction_eyes",   emoji: "👀", labelKey: "reactions.eyes" },
];

export default function ReactionButtons({ pairId }: { pairId: string }) {
  const t = useTranslations("Buddy");
  const [pending, startTransition] = useTransition();

  function send(kind: BuddyInteractionKind) {
    startTransition(async () => {
      await sendBuddyReactionAction({ pairId, kind });
    });
  }

  return (
    <div
      role="group"
      aria-label={t("reactions.groupLabel")}
      className="flex gap-2 flex-wrap"
    >
      {REACTIONS.map((r) => (
        <button
          key={r.kind}
          type="button"
          onClick={() => send(r.kind)}
          disabled={pending}
          aria-label={t(r.labelKey)}
          className="btn btn-sm flex items-center gap-2 disabled:opacity-50"
        >
          <span aria-hidden="true" className="text-base leading-none">
            {r.emoji}
          </span>
          <span>{t(r.labelKey)}</span>
        </button>
      ))}
    </div>
  );
}
