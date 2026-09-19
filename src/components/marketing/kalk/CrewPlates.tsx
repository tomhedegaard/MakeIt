import { useFormatter, useTranslations } from "next-intl";
import { TIERS, progressToNext, tierForReps, type TierKey } from "@/lib/marketing/tiers";
import { PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";
import Rule from "./Rule";
import TierLadder, { type LadderTier } from "./TierLadder";

/** The kg on each plate, lightest to heaviest: the metaphor, not a rule. */
const PLATE_KG: Record<TierKey, string> = { lifter: "5", athlete: "10", beast: "20", legend: "25" };

/** The example member's reps, as in the dashboard screen. */
const EXAMPLE_REPS = 1240;

/** Markers on the ladder (spec §4 C4): where the example member is, and where Coach School opens. */
const MARKER: Partial<Record<TierKey, "here" | "coachSchool">> = {
  [tierForReps(EXAMPLE_REPS).key]: "here",
  beast: "coachSchool",
};

/**
 * Crew (reference B `.crew-grid`, `.plates`, `.tiers`, `.repsbox`).
 * Tier floors come from the shared ladder in `lib/marketing/tiers`.
 */
export default function CrewPlates() {
  const t = useTranslations("Marketing.kalk.crew");
  const format = useFormatter();
  const current = tierForReps(EXAMPLE_REPS);
  const progress = progressToNext(EXAMPLE_REPS);
  const next = TIERS.find((tier) => tier.key === progress?.next);
  const l = useTranslations("Marketing.kalk.crew.ladder");
  const perks = useTranslations("Reps.tiers.list");

  // Perks come from the app's own Reps page, so the landing never
  // promises more than the member sees inside.
  const ladder: LadderTier[] = TIERS.map((tier, i) => {
    const marker = MARKER[tier.key];
    const floor = format.number(tier.from);
    return {
      key: tier.key,
      name: tier.name,
      kg: PLATE_KG[tier.key],
      floor: l("floor", { from: floor }),
      kicker: marker ? t(marker) : `${floor}+`,
      here: marker === "here",
      text: t(`tiers.${tier.key}`),
      perks: perks.raw(`${tier.name}.perks`) as string[],
      cta: l(i === 0 ? "ctaStart" : "ctaToward", { tier: tier.name }),
    };
  });

  return (
    <section
      id="crew"
      aria-labelledby="crew-heading"
      className="scroll-mt-[68px] pb-[clamp(72px,8vw,128px)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <Rule />

        <TierLadder
          head={
            <div>
              <p className="eyebrow mb-5 inline-flex items-center gap-2.5 before:h-0.5 before:w-7 before:bg-fg">
                {t("eyebrow")}
              </p>
              <h2 id="crew-heading" className="font-display text-[clamp(46px,6.4vw,96px)]">
                {t("heading")}
              </h2>
              <p className="mt-[22px] max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
            </div>
          }
          tiers={ladder}
          listLabel={l("listLabel")}
          hint={l("hint")}
          perksHeading={l("perksHeading")}
          ctaHref={PUBLIC_WAITLIST_HREF}
          ctaNote={l("ctaNote")}
        />

        <div className="mt-3.5 grid gap-3.5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="rounded-[14px] border border-line bg-bg-2 p-[clamp(20px,2.6vw,32px)]">
            <p className="flex justify-between gap-3 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-dim">
              <span>{current.name}</span>
              <span>{t("meterNote")}</span>
            </p>
            {progress && next ? (
              <>
                <p className="font-display mt-3 text-[clamp(54px,6vw,88px)] leading-[0.85]!">
                  {format.number(EXAMPLE_REPS)} <span className="text-fg-dim">/ {format.number(progress.at)}</span>
                </p>
                <div
                  role="img"
                  aria-label={t("meterLabel")}
                  className="relative mt-[18px] h-3 overflow-hidden rounded-md bg-bg bg-[repeating-linear-gradient(90deg,transparent_0_calc(10%_-_1px),var(--line-bright)_calc(10%_-_1px)_10%)]"
                >
                  <i style={{ width: `${progress.ratio * 100}%` }} className="block h-full rounded-md bg-fg" />
                </div>
                <p className="mt-2.5 flex justify-between font-mono text-[12px] text-fg-dim">
                  <span>{current.name}</span>
                  <span>{next.name}</span>
                </p>
              </>
            ) : null}
          </div>

          <div className="rounded-[14px] border border-line bg-bg-2 p-[clamp(20px,2.6vw,32px)]">
            <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-fg-dim">{t("earnHeading")}</p>
            <ul className="mt-2.5 list-none p-0">
              {(["sessions", "formChecks", "prs", "help"] as const).map((key) => (
                <li key={key} className="border-b border-line py-[11px] text-base last:border-b-0">
                  {t(`earn.${key}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

