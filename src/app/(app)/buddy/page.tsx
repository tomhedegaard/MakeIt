import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import ReactionButtons from "@/components/buddy/ReactionButtons";
import { getMyBuddy } from "@/lib/data/buddy";
import type { ReadinessBucket } from "@/lib/hrv/types";

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
const BUCKET_EMOJI: Record<ReadinessBucket, string> = {
  very_low: "🔴",
  low: "🟠",
  normal: "🟢",
  high: "⚡",
  very_high: "🚀",
};

function bucketEmoji(b: ReadinessBucket | null): string {
  return b ? BUCKET_EMOJI[b] : "❔";
}

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
        <header className="pt-2">
          <div className="eyebrow mb-2">{t("eyebrow")}</div>
          <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
            {t("titleEmpty")}
          </h1>
          <p className="mt-2 text-fg-dim text-sm">{t("emptyBody")}</p>
        </header>
      </Container>
    );
  }

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {t("titleWithHandle", { handle: buddy.buddyHandle })}
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          {t("subtitle", { tier: buddy.buddyTier })}
        </p>
      </header>

      <section className="surface rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="eyebrow mb-1">
              {t("readinessLabel", { handle: buddy.buddyHandle })}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl leading-none" aria-hidden="true">
                {bucketEmoji(buddy.buddyReadinessBucket)}
              </span>
              <span className="text-sm text-fg-dim">
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
          <div className="surface-2 rounded-lg p-6 text-center">
            <p className="text-fg-dim text-sm">{t("noInteractions")}</p>
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
                  <span aria-hidden="true" className="text-xl leading-none shrink-0">
                    {i.kind === "reaction_fire" && "🔥"}
                    {i.kind === "reaction_strong" && "💪"}
                    {i.kind === "reaction_eyes" && "👀"}
                    {i.kind === "nudge_session" && "🏋️"}
                    {i.kind === "nudge_sleep" && "🌙"}
                    {i.kind === "comment" && "💬"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-fg-faint mb-0.5">
                      {fromYou
                        ? t("interactionFromYou")
                        : t("interactionFromBuddy", { handle: buddy.buddyHandle })}
                      <span className="mx-1">·</span>
                      {relativeTimeDa(i.createdAt)}
                    </div>
                    {i.body ? (
                      <p className="text-sm text-fg/90 leading-snug">{i.body}</p>
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
