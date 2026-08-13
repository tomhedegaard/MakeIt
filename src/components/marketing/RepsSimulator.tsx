"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Reps-simulator (UX-audit B3 + B4).
 *
 * Landingen havde ét interaktivt element — motor-playgrounden — og det
 * lå seks skærme nede. Tier-sektionen havde samtidig en helt tom højre
 * kolonne på desktop. Denne panel løser begge: besøgende skruer på sin
 * egen måned og ser hvornår hun rammer Athlete, Beast og Legend.
 *
 * Tallene er IKKE opfundet til marketing — de er de samme optjenings-
 * regler som står i Reps-programmet i appen (Reps.json → how.list) og
 * de samme tier-grænser som migration 0008 bruger til faktisk
 * promotion. Ændrer reglerne sig, skal begge steder rettes;
 * simulatoren må aldrig love mere end ledgeren giver.
 */
const EARN = {
  weeks: 100, // pr. fuldført programuge (maks 4/md)
  prs: 250, // pr. PR logget med video
  invites: 500, // pr. ven der aktiverer
  challenges: 1000, // pr. vundet månedlig challenge
} as const;

const TIERS = [
  { key: "athlete", name: "Athlete", at: 1000 },
  { key: "beast", name: "Beast", at: 5000 },
  { key: "legend", name: "Legend", at: 15000 },
] as const;

type Field = keyof typeof EARN;

const FIELDS: { id: Field; max: number }[] = [
  { id: "weeks", max: 4 },
  { id: "prs", max: 8 },
  { id: "invites", max: 4 },
  { id: "challenges", max: 2 },
];

export default function RepsSimulator() {
  const t = useTranslations("Marketing.tiers.sim");
  const [v, setV] = useState<Record<Field, number>>({
    weeks: 4,
    prs: 1,
    invites: 0,
    challenges: 0,
  });

  const perMonth =
    v.weeks * EARN.weeks +
    v.prs * EARN.prs +
    v.invites * EARN.invites +
    v.challenges * EARN.challenges;

  function step(id: Field, delta: number, max: number) {
    setV((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(max, prev[id] + delta)),
    }));
  }

  return (
    <div className="surface-2 rounded-lg p-6 md:p-8">
      <div className="eyebrow mb-2">{t("eyebrow")}</div>
      <h3 className="font-display text-2xl md:text-3xl leading-tight mb-6">
        {t("heading")}
      </h3>

      <ul className="space-y-3">
        {FIELDS.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between gap-4 border-t hairline pt-3"
          >
            <div className="min-w-0">
              <div className="text-sm text-fg leading-snug">{t(`fields.${f.id}`)}</div>
              <div className="text-[11px] font-mono text-fg-faint uppercase tracking-[0.14em]">
                +{EARN[f.id].toLocaleString("da-DK")} {t("repsEach")}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => step(f.id, -1, f.max)}
                disabled={v[f.id] === 0}
                aria-label={t("decrease", { label: t(`fields.${f.id}`) })}
                className="size-8 rounded-full border hairline-strong text-fg-dim hover:text-fg disabled:opacity-30 touch-app"
              >
                −
              </button>
              <span className="numeric w-6 text-center text-lg tabular-nums">
                {v[f.id]}
              </span>
              <button
                type="button"
                onClick={() => step(f.id, 1, f.max)}
                disabled={v[f.id] === f.max}
                aria-label={t("increase", { label: t(`fields.${f.id}`) })}
                className="size-8 rounded-full border hairline-strong text-fg-dim hover:text-fg disabled:opacity-30 touch-app"
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 pt-5 border-t hairline">
        <div className="flex items-baseline gap-3">
          <span className="numeric text-4xl md:text-5xl font-medium tabular-nums">
            {perMonth.toLocaleString("da-DK")}
          </span>
          <span className="eyebrow">{t("perMonth")}</span>
        </div>

        <ul className="mt-5 space-y-2" aria-live="polite">
          {TIERS.map((tier) => {
            const months = perMonth > 0 ? Math.ceil(tier.at / perMonth) : null;
            return (
              <li
                key={tier.key}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-fg-dim">
                  {tier.name}{" "}
                  <span className="text-fg-faint numeric tabular-nums">
                    {tier.at.toLocaleString("da-DK")}
                  </span>
                </span>
                <span className="numeric text-fg tabular-nums">
                  {months === null
                    ? "—"
                    : months <= 1
                      ? t("withinMonth")
                      : t("months", { n: months })}
                </span>
              </li>
            );
          })}
        </ul>

        <p className="mt-5 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
          {t("note")}
        </p>
      </div>
    </div>
  );
}
