"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PhoneStatusBar, PhoneTabBar } from "@/components/marketing/phone/PhoneFrame";
import {
  DEMO_DEFAULTS,
  DEMO_TOP_SET_KG,
  HRV_RANGE,
  SLEEP_RANGE,
  STRESS_RANGE,
  runDemo,
  type DemoSliders,
} from "@/lib/marketing/kalk/engine-demo";

/** Intro-nedtællingen fra 150 til motorens svar. Kører én gang. */
const INTRO_MS = 700;

/**
 * Motor-demoen i hero (spec 2026-09-18 §3). Tre skydere, ét kald til
 * appens rigtige regelfunktion, ét resultat. Ingen netværk: tallene
 * forlader aldrig browseren.
 *
 * Resultatet står i ét DOM-element med én `aria-live`-region. Under
 * `lg` er det et almindeligt Kalk-kort (den besøgende holder allerede
 * en telefon), og resultatet står før skyderne, så pointen er på
 * skærmen med det samme. Fra `lg` foldes det samme element ud til en
 * telefon med `PhoneFrame`s sprog: `--pw`, de to radier afledt af
 * bredden, `bg-fg`-kant, `bg-bg`-skærm og 9/19.5. Status- og
 * fanebjælken er PhoneFrames egne, importeret, så telefonen i hero er
 * den samme genstand som telefonerne længere nede.
 *
 * Skyderne henter min, max og step fra `engine-demo`, så landingen
 * aldrig kan stille motoren et spørgsmål den ikke er bygget til.
 * Tommelfingeren er 44 px; den styles i `globals.css` (`.kalk-range`)
 * sammen med resten af Kalk.
 */
export default function EngineDemo() {
  const t = useTranslations("Marketing.kalk.demo");
  const [sliders, setSliders] = useState<DemoSliders>(DEMO_DEFAULTS);
  /** Ikke-null mens intro-nedtællingen kører. */
  const [introKg, setIntroKg] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const introDone = useRef(false);

  const result = runDemo(sliders);
  const set = (patch: Partial<DemoSliders>) => {
    // Et skyder-træk overtager tallet med det samme: intro-bevægelsen
    // hører til første visning, ikke til hver ændring.
    introDone.current = true;
    setIntroKg(null);
    setSliders((s) => ({ ...s, ...patch }));
  };
  const hours = `${Math.floor(sliders.sleep)} t ${sliders.sleep % 1 === 0 ? "00" : "30"} m`;
  const shownKg = introKg ?? result.topSetKg;

  /**
   * Sidens ene bevægelse: når kortet første gang er i syne, tælles
   * topsættet ned fra 150 til motorens svar, mens stregen tegnes over
   * det gamle tal (`kalk-strike` i globals.css, sat i gang af
   * `data-motion`). Samme IntersectionObserver-form som
   * NightCurveReveal. `prefers-reduced-motion` springer den over og
   * viser sluttilstanden med det samme.
   */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    let raf = 0;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    const run = () => {
      card.dataset.motion = "run";
      if (reduced || introDone.current) return;
      const target = runDemo(DEMO_DEFAULTS).topSetKg;
      if (target === DEMO_TOP_SET_KG) return;
      const started = performance.now();
      setIntroKg(DEMO_TOP_SET_KG);
      const tick = (now: number) => {
        if (introDone.current) return;
        const p = Math.min(1, (now - started) / INTRO_MS);
        if (p >= 1) {
          introDone.current = true;
          setIntroKg(null);
          return;
        }
        const eased = 1 - (1 - p) ** 3;
        setIntroKg(Math.round(DEMO_TOP_SET_KG + (target - DEMO_TOP_SET_KG) * eased));
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(raf);
    }
    // Uden JS kører stregen som før ved mount; med JS holdes den
    // tilbage (`armed`), til kortet er i syne.
    card.dataset.motion = "armed";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          io.disconnect();
          run();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(card);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // Skærmlæsere skal høre, hvad der ændrede sig; seende ser et rent kort
  // med en statisk kicker. `liveRegionPrefix` hører kun hjemme her.
  const announcement = [
    t("liveRegionPrefix"),
    `${t("topSetLabel")} ${result.topSetKg} kg`,
    result.accessorySetsDropped
      ? t("accessoryDropped", { count: result.accessorySetsDropped })
      : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:gap-6 xl:gap-10">
      <div className="order-2 flex w-full flex-col gap-5 lg:order-1 lg:max-w-[320px]">
        {/* Ikke klassen "eyebrow": KalkHero.test.tsx kræver, at heroen ikke har en. */}
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim lg:hidden">
          {t("tryIt")}
        </p>
        <Slider
          id="demo-sleep"
          label={t("sleepLabel")}
          display={hours}
          range={SLEEP_RANGE}
          value={sliders.sleep}
          onChange={(sleep) => set({ sleep })}
        />
        <Slider
          id="demo-hrv"
          label={t("hrvLabel")}
          display={`${sliders.hrv}`}
          unit={t("hrvUnit")}
          range={HRV_RANGE}
          value={sliders.hrv}
          onChange={(hrv) => set({ hrv })}
        />
        <Slider
          id="demo-stress"
          label={t("stressLabel")}
          display={`${sliders.stress}`}
          unit={t("stressUnit")}
          range={STRESS_RANGE}
          value={sliders.stress}
          onChange={(stress) => set({ stress })}
        />
        <p className="font-mono text-[11px] leading-relaxed text-fg-faint">{t("bandNote")}</p>
      </div>

      {/* Ét element, to former: Kalk-kort under lg, telefon fra lg. */}
      <div
        ref={cardRef}
        aria-live="polite"
        data-demo-card
        className={[
          "relative order-1 w-full rounded-[14px] border border-line bg-bg-2 lg:order-2",
          "lg:[--pw:288px] lg:aspect-[9/19.5] lg:w-[var(--pw)] lg:flex-none",
          "lg:rounded-[calc(var(--pw)*0.16)] lg:border-0 lg:bg-fg lg:p-[calc(var(--pw)*0.032)]",
          "lg:shadow-[0_40px_60px_-30px_color-mix(in_oklab,var(--fg)_45%,transparent),0_12px_24px_-12px_color-mix(in_oklab,var(--fg)_30%,transparent)]",
        ].join(" ")}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[13px] lg:rounded-[calc(var(--pw)*0.13)] lg:bg-bg">
          <PhoneStatusBar className="hidden lg:flex" />
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="border-b border-line px-4 pb-3 pt-4 lg:px-5 lg:pb-3.5 lg:pt-1">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">{t("todayLabel")}</p>
              <p className="font-display mt-1.5 text-3xl">{t("sessionTitle")}</p>
              <span className="sr-only">{announcement}</span>
            </div>
            <div className="flex flex-1 flex-col gap-3.5 px-4 pb-4 pt-4 lg:gap-4 lg:px-5 lg:pb-5 lg:pt-5">
              <div className="rounded-[14px] border border-line-strong bg-bg-elev p-4 lg:bg-bg-2 lg:p-[18px]">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">{t("topSetLabel")}</p>
                <p className="mt-2 flex items-baseline gap-2.5">
                  {result.changed ? (
                    <span className="strike-signal font-display text-3xl text-fg-faint">{DEMO_TOP_SET_KG}</span>
                  ) : null}
                  <span className="kalk-topset font-display text-5xl">{shownKg}</span>
                  <span className="font-mono text-xs text-fg-dim">kg</span>
                </p>
                <p className="mt-2.5 text-xs leading-relaxed text-fg-dim">{result.decision.explanationDa}</p>
              </div>

              {result.accessorySetsDropped ? (
                <p className="text-[13px] text-fg-dim">
                  {t("accessoryDropped", { count: result.accessorySetsDropped })}
                </p>
              ) : null}
              {result.decision.action === "no_change" ? (
                <p className="text-[13px] text-fg-dim">{t("unchanged")}</p>
              ) : null}

              <div className="flex gap-2">
                <span className="rounded-full border border-line-strong px-2.5 py-1.5 font-mono text-[9px] tracking-[0.08em] text-fg-dim">
                  {t("whySleep", { hours })}
                </span>
                <span className="rounded-full border border-line-strong px-2.5 py-1.5 font-mono text-[9px] tracking-[0.08em] text-fg-dim">
                  {t("whyHrv", { ms: sliders.hrv })}
                </span>
              </div>

              {/* Tekst, ikke en knap: valget findes i appen, men gør intet her,
                  og en død knap er værre end en linje. Derfor ingen pille,
                  ingen kant rundt, ingen centrering, kun en hårfin streg
                  over, som resten af kortets brødtekst. */}
              <p className="border-t border-line pt-3 text-left text-[12px] text-fg-dim lg:mt-auto">
                {t("keepOriginal")}
              </p>
            </div>
          </div>
          <PhoneTabBar tab="train" className="mt-auto hidden lg:grid" />
        </div>
        {/* Øen ligger på kanten, som på PhoneFrame. Kun telefon-formen. */}
        <i
          aria-hidden="true"
          className="absolute left-1/2 top-[calc(var(--pw)*0.032_+_9px)] z-10 hidden h-6 w-[31%] -translate-x-1/2 rounded-[14px] bg-fg lg:block"
        />
      </div>
    </div>
  );
}

function Slider({
  id,
  label,
  display,
  unit,
  range,
  value,
  onChange,
}: {
  id: string;
  label: string;
  display: string;
  unit?: string;
  range: { readonly min: number; readonly max: number; readonly step?: number };
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <div>
      {/* Wraps the value under the label rather than breaking it, where the column is narrow. */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim">
          {label}
        </label>
        <span className="font-display whitespace-nowrap text-[clamp(20px,1.9vw,30px)]">
          {display}
          {unit ? <small className="ml-1 font-mono text-xs text-fg-dim">{unit}</small> : null}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="kalk-range mt-1 w-full"
      />
    </div>
  );
}
