import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PromoteToLiveButton from "@/components/coach/PromoteToLiveButton";
import {
  PROMOTE_THRESHOLD,
  ROLLING_WINDOW,
  getBeastsInTraining,
  getSandboxTier,
  type BeastInTraining,
} from "@/lib/data/coach-school";

/**
 * CC-7 — Munks ops-view: Beasts in training.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §7
 *
 * Lists every member in `coach_tier='beast_sandbox'` with rolling
 * agreement-score stats (over the last 50 sandbox reviews) so Munk
 * can spot who's ready to go live. Each row exposes the
 * Promote-to-live button built in CC-5 (`promoteToLiveAction`).
 *
 * Auth — two layers:
 *   - /coach/layout.tsx gates on `isCoach` (filters out non-coach members).
 *   - This page additionally requires `coach_tier='munk'`: a Beast who
 *     is_coach=true must NOT see other Beasts' agreement stats. Beasts
 *     are redirected to /coach-school/sandbox (their actual surface).
 */
export default async function CoachCoCoachesPage() {
  const t = await getTranslations("Coach.coCoaches");
  const tier = await getSandboxTier();
  if (tier !== "munk") {
    // beast_sandbox / beast_live land on their own surfaces;
    // a non-tier coach is bounced to the overview.
    if (tier === "beast_sandbox") redirect("/coach-school/sandbox");
    if (tier === "beast_live") redirect("/coach-school/live");
    redirect("/coach");
  }

  const beasts = await getBeastsInTraining();

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {t("title")}
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          {t("subtitle", {
            count: beasts.length,
            threshold: Math.round(PROMOTE_THRESHOLD * 100),
            window: ROLLING_WINDOW,
          })}
        </p>
      </header>

      {beasts.length === 0 ? (
        <div className="surface-2 rounded-lg p-6 text-center">
          <p className="text-fg-dim text-sm">{t("empty")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {beasts.map((b) => (
            <li key={b.memberId}>
              <BeastRow beast={b} />
            </li>
          ))}
        </ul>
      )}

      <footer className="pt-4 border-t hairline">
        <p className="text-xs font-mono text-fg-faint">{t("footnote")}</p>
      </footer>
    </Container>
  );
}

/** One row on the co-coaches surface. Server-rendered; only the
 *  promote button is a client island. */
async function BeastRow({ beast }: { beast: BeastInTraining }) {
  const t = await getTranslations("Coach.coCoaches");
  const agreementPct =
    beast.rollingAgreement === null
      ? null
      : Math.round(beast.rollingAgreement * 100);
  const meetsThreshold =
    beast.rollingAgreement !== null &&
    beast.rollingAgreement >= PROMOTE_THRESHOLD;

  return (
    <div className="surface rounded-lg p-5 flex flex-wrap items-center gap-x-6 gap-y-3 justify-between">
      <div className="min-w-0">
        <div className="eyebrow">@{beast.handle}</div>
        <div className="mt-1 flex items-baseline gap-3 flex-wrap">
          <span
            className={`numeric text-2xl ${
              meetsThreshold ? "text-fg" : "text-fg-dim"
            }`}
          >
            {agreementPct === null ? "—" : `${agreementPct}%`}
          </span>
          <span className="text-xs font-mono text-fg-faint">
            {t("reviewsLabel", { count: beast.sandboxReviewCount })}
          </span>
          {beast.lastReviewAt ? (
            <span className="text-xs font-mono text-fg-faint">
              {t("lastReviewLabel", { iso: beast.lastReviewAt })}
            </span>
          ) : null}
        </div>
      </div>

      <PromoteToLiveButton
        beastMemberId={beast.memberId}
        beastHandle={beast.handle}
        liveReady={beast.liveReady}
      />
    </div>
  );
}
