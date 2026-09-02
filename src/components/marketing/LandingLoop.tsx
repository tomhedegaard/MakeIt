import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { MarketingDomainKicker } from "@/components/marketing/FigureLanguage";
import { PROGRAM_PROOF } from "@/lib/marketing/loop-proof";
import { cn } from "@/lib/utils";

type Copy = (key: string) => string;

/**
 * Landing three-beat loop — Program and Form-check.
 *
 * Helhed (Beat C) stays on MarketingBodyMap; the eight phones sit
 * after that as a quieter gallery. Each beat is eyebrow + tight
 * display heading + one sentence + one product-in-frame proof.
 * No scroll-jack. No sparkle orb. Body-domain ink only on Beat A,
 * and only in the mark / stroke / shifted cell — never body copy.
 * See docs/DOMAIN_COLOR_SYSTEM.md and docs/MAKEIT_FIGURE.md.
 */
export default async function LandingLoop() {
  const program = await getTranslations("Marketing.loop.program");
  const form = await getTranslations("Marketing.loop.formCheck");

  return (
    <section id="loop" className="relative">
      <LandingBeat
        beat="program"
        domain="body"
        eyebrow={program("eyebrow")}
        heading={program("heading")}
        body={program("body")}
      >
        <ProgramProof t={program} />
      </LandingBeat>
      <LandingBeat
        beat="form-check"
        eyebrow={form("eyebrow")}
        heading={form("heading")}
        body={form("body")}
      >
        <FormCheckProof t={form} />
      </LandingBeat>
    </section>
  );
}

export function LandingBeat({
  beat,
  domain,
  eyebrow,
  heading,
  body,
  children,
}: {
  beat: "program" | "form-check";
  domain?: "body";
  eyebrow: string;
  heading: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <div
      data-landing-beat={beat}
      data-domain={domain}
      className="relative border-t hairline"
    >
      <Container className="py-16 md:py-24">
        <div className="max-w-2xl" data-reveal>
          <div className="eyebrow eyebrow-domain mb-5">{eyebrow}</div>
          <h2 className="font-display text-[clamp(2rem,4.8vw,3.6rem)] leading-[0.92] [overflow-wrap:break-word]">
            {heading}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-fg-dim md:text-xl">
            {body}
          </p>
        </div>
        <div className="mt-10 md:mt-14" data-reveal>
          {children}
        </div>
      </Container>
    </div>
  );
}

const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;
const WEEK_SLOTS = ["A", "B", "C", "A", "D", "—"] as const;
const SHIFTED_DAY = "thu";

export function ProgramProof({ t }: { t: Copy }) {
  return (
    <div
      data-landing-proof="program"
      data-domain="body"
      className="surface-2 max-w-3xl overflow-hidden rounded-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline px-5 py-4 md:px-7">
        <MarketingDomainKicker
          domain="body"
          label={t("proof.week")}
        />
        <span className="font-display text-lg leading-none md:text-xl">
          {t("proof.exercise")}
        </span>
      </div>

      <ol className="grid grid-cols-6 gap-px bg-line border-b hairline">
        {WEEK_DAYS.map((day, i) => {
          const shifted = day === SHIFTED_DAY;
          return (
            <li
              key={day}
              data-landing-week-cell={day}
              data-shifted={shifted ? "true" : undefined}
              className={cn(
                "bg-bg-2 px-2 py-3 text-center md:px-3 md:py-4",
                shifted && "bg-bg-3",
              )}
            >
              <div className="text-[9px] font-mono uppercase tracking-[0.16em] text-fg-faint">
                {t(`proof.days.${day}`)}
              </div>
              <div className="mt-1 font-display text-lg leading-none md:text-xl">
                {WEEK_SLOTS[i]}
              </div>
              {shifted ? (
                <>
                  <span className="domain-stroke mx-auto mt-2" aria-hidden />
                  <div className="mt-2 numeric text-[11px] text-fg">
                    {PROGRAM_PROOF.afterKg}
                  </div>
                  <div className="numeric text-[10px] text-fg-faint line-through">
                    {PROGRAM_PROOF.beforeKg}
                  </div>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-px bg-line md:grid-cols-2">
        <div className="bg-bg-2 px-5 py-5 md:px-7">
          <div className="eyebrow mb-2">{t("proof.beforeLabel")}</div>
          <div className="numeric text-xl text-fg md:text-2xl">
            {t("proof.beforeValue")}
          </div>
        </div>
        <div className="bg-bg-3 px-5 py-5 md:px-7" data-landing-shift>
          <div className="eyebrow eyebrow-domain mb-2">
            {t("proof.afterLabel")}
          </div>
          <div className="numeric text-xl text-fg md:text-2xl">
            {t("proof.afterValue")}
          </div>
          <div className="mt-2 text-[11px] font-mono uppercase tracking-[0.16em] text-fg-dim">
            {t("proof.shift")}
          </div>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 border-t hairline px-5 py-4 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint md:px-7">
        <li>{t("proof.reasonHrv")}</li>
        <li>{t("proof.reasonSleep")}</li>
        <li>{t("proof.reasonMind")}</li>
      </ul>
      <p className="border-t hairline px-5 py-3 text-xs text-fg-faint md:px-7">
        {t("proof.note")}
      </p>
    </div>
  );
}

export function FormCheckProof({ t }: { t: Copy }) {
  const steps = [
    { n: "01", label: t("proof.step1Label"), value: t("proof.step1Value") },
    {
      n: "02",
      label: t("proof.step2Label"),
      value: t("proof.step2Value"),
      signed: t("proof.step2Signed"),
    },
    { n: "03", label: t("proof.step3Label"), value: t("proof.step3Value") },
  ];

  return (
    <ol
      data-landing-proof="form-check"
      className="surface-2 max-w-3xl divide-y hairline overflow-hidden rounded-2xl"
    >
      {steps.map((step) => (
        <li
          key={step.n}
          data-landing-step={step.n}
          className="grid gap-4 px-5 py-6 md:grid-cols-12 md:items-baseline md:px-7"
        >
          <span className="numeric text-fg-faint text-sm md:col-span-1">
            {step.n}
          </span>
          <div className="md:col-span-3">
            <div className="eyebrow">{step.label}</div>
          </div>
          <div className="md:col-span-8">
            {step.n === "01" ? (
              <div
                data-landing-film
                className="mb-3 aspect-[4/5] max-w-[9rem] rounded-md border hairline-strong bg-steel"
                aria-hidden
              />
            ) : null}
            <p className="text-base leading-snug text-fg md:text-lg">
              {step.value}
            </p>
            {step.signed ? (
              <p className="mt-2 text-[11px] font-mono uppercase tracking-[0.16em] text-fg-faint">
                {step.signed}
              </p>
            ) : null}
          </div>
        </li>
      ))}
      <li className="px-5 py-3 text-xs text-fg-faint md:px-7">
        {t("proof.note")}
      </li>
    </ol>
  );
}
