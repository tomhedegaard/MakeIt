import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";
import ReactionButtons from "@/components/buddy/ReactionButtons";
import { getMyBuddy } from "@/lib/data/buddy";
import type { ReadinessBucket } from "@/lib/hrv/types";
import { BicepsFlexed, Dumbbell, Eye, Flame, MessageSquare, Moon } from "lucide-react";
import { ICON } from "@/components/ui/icon";

/**
 * CC-3 — /buddy overview surface.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §6
 *
 * Shows the member's current buddy: handle, tier, today's readiness
 * emoji, last three buddy_interactions, and reaction buttons. Empty
 * state covers "not paired yet" honestly — the next rematch cron
 * (Sundays 19:00 UTC) will pair the member if a compatible partner
 * appears at the same tier.
 *
 * The chat thread route (/buddy/chat) is deferred — that's a non-trivial
 * refactor of the existing /messages chat UI to scope by thread_type.
 * Spec §6 outlines the migration (conversations.thread_type column +
 * buddy_threads view) which lands in a CC-3 follow-up.
 */
const BUCKET_LEVEL: Record<ReadinessBucket, number> = {
  very_low: 1,
  low: 2,
  normal: 3,
  high: 4,
  very_high: 5,
};

/**
 * Readiness as five flat segments in the Hjerte colour, filled up to the
 * bucket (Nord, spec §11: data is ink, never a traffic-light emoji).
 * Unknown shows five empty segments.
 */
function ReadinessBar({ bucket }: { bucket: ReadinessBucket | null }) {
  const level = bucket ? BUCKET_LEVEL[bucket] : 0;
  return (
    <span data-domain="heart" className="flex gap-1" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= level ? "h-3 w-4 bg-domain" : "h-3 w-4 bg-bg-3"} />
      ))}
    </span>
  );
}

const INTERACTION_ICON = {
  reaction_fire: Flame,
  reaction_strong: BicepsFlexed,
  reaction_eyes: Eye,
  nudge_session: Dumbbell,
  nudge_sleep: Moon,
  comment: MessageSquare,
} as const;

function relativeTimeDa(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  const diffMs = now.getTime() - then;
  const m = Math.round(diffMs / 60_000);
  if (m < 60) return `${m} min siden`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} ${h === 1 ? "time" : "timer"} siden`;
  const d = Math.round(h / 24);
  return `${d} ${d === 1 ? "dag" : "dage"} siden`;
}

export default async function BuddyPage() {
  const t = await getTranslations("Buddy");
  const buddy = await getMyBuddy();

  if (!buddy) {
    return (
      <Container className="py-6 lg:py-12 space-y-6">
        <div className="pt-2">
          <PageTitle kicker={t("eyebrow")} title={t("titleEmpty")} />
          <p className="mt-2 text-fg-dim text-copy">{t("emptyBody")}</p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <div className="pt-2">
        <PageTitle
          kicker={t("eyebrow")}
          title={t("titleWithHandle", { handle: buddy.buddyHandle })}
        />
        <p className="mt-2 text-fg-dim text-copy">
          {t("subtitle", { tier: buddy.buddyTier })}
        </p>
      </div>

      <section className="surface p-5 space-y-4">
        {/* Wraps on a phone: the readiness and the "why" link do not fit
            side by side at 375 px. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">
              {t("readinessLabel", { handle: buddy.buddyHandle })}
            </div>
            <div className="flex items-baseline gap-2">
              <ReadinessBar bucket={buddy.buddyReadinessBucket} />
              <span className="text-meta text-fg-dim">
                {buddy.buddyReadinessBucket
                  ? t(`buckets.${buddy.buddyReadinessBucket}`)
                  : t("buckets.unknown")}
              </span>
            </div>
          </div>
          <Link
            href="/buddy/why"
            className="btn btn-sm"
          >
            {t("whyLink")}
          </Link>
        </div>

        <div>
          <div className="eyebrow mb-2">{t("reactionsHeader")}</div>
          <ReactionButtons pairId={buddy.pairId} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="eyebrow">{t("recentHeader")}</div>
        {buddy.recentInteractions.length === 0 ? (
          <div className="surface-2 rounded-lg p-6">
            <p className="text-fg-dim text-meta">{t("noInteractions")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {buddy.recentInteractions.map((i) => {
              const fromYou = i.fromMember !== buddy.buddyMemberId;
              return (
                <li
                  key={i.id}
                  className="surface-2 rounded-lg p-3 flex items-start gap-3"
                >
                  {(() => {
                    const Icon = INTERACTION_ICON[i.kind as keyof typeof INTERACTION_ICON];
                    return Icon ? <Icon {...ICON} className="size-5 shrink-0 text-fg-dim" /> : null;
                  })()}
                  <div className="min-w-0 flex-1">
                    <div className="text-micro text-fg-faint mb-0.5">
                      {fromYou
                        ? t("interactionFromYou")
                        : t("interactionFromBuddy", { handle: buddy.buddyHandle })}
                      <span className="mx-1">·</span>
                      {relativeTimeDa(i.createdAt)}
                    </div>
                    {i.body ? (
                      <p className="text-copy text-fg/90">{i.body}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Container>
  );
}
