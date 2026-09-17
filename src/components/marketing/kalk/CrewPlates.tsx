import { useFormatter, useTranslations } from "next-intl";
import { TIERS, progressToNext, tierForReps, type TierKey } from "@/lib/marketing/tiers";
import { cn } from "@/lib/utils";
import Rule from "./Rule";

/** The example member's reps, as in the dashboard screen. */
const EXAMPLE_REPS = 1240;

/**
 * Each tier as a bumper plate, lightest to heaviest (reference B
 * `.plates`). The kg figure is the plate metaphor, not a rule. Sizes
 * use container units, so the row scales with its column.
 */
const PLATE: Record<TierKey, { kg: string; basis: string; label: string; dark?: boolean }> = {
  lifter: { kg: "5", basis: "basis-[16%]", label: "text-[4cqi]" },
  athlete: { kg: "10", basis: "basis-[21%]", label: "text-[5.2cqi]" },
  beast: { kg: "20", basis: "basis-[26%]", label: "text-[6.4cqi]" },
  legend: { kg: "25", basis: "basis-[31%]", label: "text-[7.6cqi]", dark: true },
};

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

  return (
    <section
      id="crew"
      aria-labelledby="crew-heading"
      className="scroll-mt-[68px] pb-[clamp(72px,8vw,128px)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <Rule />

        <div className="mt-[clamp(48px,6vw,90px)] grid items-end gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <div>
            <p className="eyebrow mb-5 inline-flex items-center gap-2.5 before:h-0.5 before:w-7 before:bg-fg">
              {t("eyebrow")}
            </p>
            <h2 id="crew-heading" className="font-display text-[clamp(46px,6.4vw,96px)]">
              {t("heading")}
            </h2>
            <p className="mt-[22px] max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
          </div>

          <div>
            <span id="tiers" className="block scroll-mt-[88px]" />
            <div
              aria-hidden="true"
              className="relative flex items-center justify-between py-5 [container-type:inline-size] before:absolute before:inset-x-[-12px] before:top-1/2 before:z-0 before:h-3.5 before:-translate-y-1/2 before:rounded-[3px] before:bg-[linear-gradient(var(--bg-3),color-mix(in_oklab,var(--fg)_22%,var(--bg-3)))]"
            >
              {TIERS.map((tier) => (
                <Plate key={tier.key} tier={tier.key} current={tier.key === current.key} />
              ))}
            </div>

            <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-line-bright md:grid-cols-4">
              {TIERS.map((tier) => {
                const marker = MARKER[tier.key];
                return (
                  <div key={tier.key} data-tier={tier.key} className="pt-3.5">
                    <p
                      className={cn(
                        "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.06em]",
                        marker === "here" ? "text-fg" : "text-fg-dim",
                      )}
                    >
                      {marker === "here" ? (
                        <i aria-hidden="true" className="inline-block size-1.5 flex-none rounded-full bg-signal" />
                      ) : null}
                      {marker ? t(marker) : `${format.number(tier.from)}+`}
                    </p>
                    <h3 className="font-display mt-1 text-[clamp(22px,2.2vw,30px)] leading-none!">{tier.name}</h3>
                    <p className="mt-1.5 text-[14px] text-fg-dim">{t(`tiers.${tier.key}`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-[clamp(48px,6vw,80px)] grid gap-3.5 md:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
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

function Plate({ tier, current }: { tier: TierKey; current: boolean }) {
  const plate = PLATE[tier];
  return (
    <div className={cn("relative z-[1] flex min-w-0 flex-none flex-col items-center", plate.basis)}>
      <div
        data-plate={tier}
        data-current={current ? "true" : undefined}
        className={cn(
          "grid aspect-square w-full place-items-center rounded-full border",
          "shadow-[0_18px_30px_-18px_color-mix(in_oklab,var(--fg)_50%,transparent)]",
          plate.dark
            ? "border-fg bg-[repeating-radial-gradient(circle,color-mix(in_oklab,var(--fg)_88%,var(--bg))_0_6px,var(--fg)_6px_7px)]"
            : "border-line-bright bg-[repeating-radial-gradient(circle,var(--bg-2)_0_5px,var(--bg-3)_5px_6px)]",
          current && "outline-4 outline-offset-[5px] outline-signal",
        )}
      >
        <b
          className={cn(
            "font-display grid aspect-square w-[46%] place-items-center rounded-full border leading-none!",
            plate.label,
            plate.dark
              ? "border-[color-mix(in_oklab,var(--bg)_20%,var(--fg))] bg-fg text-bg"
              : "border-line bg-bg-2",
          )}
        >
          {plate.kg}
        </b>
      </div>
    </div>
  );
}
