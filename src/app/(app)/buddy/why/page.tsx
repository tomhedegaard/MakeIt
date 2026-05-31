import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getMyBuddy } from "@/lib/data/buddy";

/**
 * CC-3 — /buddy/why explainer surface.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §5, §6
 *
 * Renders the matcher's top_factors (CC-2 pairing_reason jsonb) as
 * localized one-line explanations. Each factor code maps to a Coach-
 * Pyramid-style sentence in Coach.Buddy.factors.* so the algorithmic
 * decision becomes legible: "you and Mads paired because..."
 *
 * If the member has no buddy yet, link back to /buddy (which shows
 * the empty state honestly).
 */
const KNOWN_FACTORS: ReadonlySet<string> = new Set([
  "engagement_balance",
  "training_phase_offset",
  "goal_focus_alignment",
  "hrv_pattern_complement",
  "session_frequency_match",
]);

export default async function BuddyWhyPage() {
  const t = await getTranslations("Buddy");
  const buddy = await getMyBuddy();

  if (!buddy || !buddy.pairingReason) {
    return (
      <Container className="py-6 lg:py-12 space-y-6">
        <header className="pt-2">
          <div className="eyebrow mb-2">{t("eyebrow")}</div>
          <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
            {t("whyTitleEmpty")}
          </h1>
          <p className="mt-2 text-fg-dim text-sm">
            {t("whyEmptyBody")}
          </p>
        </header>
        <Link href="/buddy" className="btn">
          {t("backToBuddy")}
        </Link>
      </Container>
    );
  }

  // Render only factors the matcher knows — defensive against future
  // codes appearing in older rows (or vice versa) without breaking i18n.
  const factors = buddy.pairingReason.top_factors.filter((f) =>
    KNOWN_FACTORS.has(f),
  );

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {t("whyTitle", { handle: buddy.buddyHandle })}
        </h1>
        <p className="mt-2 text-fg-dim text-sm">{t("whyIntro")}</p>
      </header>

      <ol className="space-y-3 list-none">
        {factors.map((code, i) => (
          <li
            key={code}
            className="surface rounded-lg p-4 flex items-start gap-3"
          >
            <span className="numeric text-2xl text-fg-faint shrink-0 leading-none">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="eyebrow mb-1">{t(`factors.${code}.title`)}</div>
              <p className="text-sm text-fg/90 leading-relaxed">
                {t(`factors.${code}.body`, { handle: buddy.buddyHandle })}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <footer className="pt-4 border-t hairline">
        <p className="text-xs font-mono text-fg-faint">
          {t("whyAlgoLine", {
            version: buddy.pairingReason.algo_version,
            score: buddy.pairingReason.score,
          })}
        </p>
        <Link
          href="/buddy"
          className="btn btn-sm mt-4 inline-flex"
        >
          {t("backToBuddy")}
        </Link>
      </footer>
    </Container>
  );
}
