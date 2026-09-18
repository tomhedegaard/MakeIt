"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  DEMO_DEFAULTS,
  DEMO_TOP_SET_KG,
  HRV_RANGE,
  SLEEP_RANGE,
  STRESS_RANGE,
  runDemo,
  type DemoSliders,
} from "@/lib/marketing/kalk/engine-demo";

/**
 * Motor-demoen i hero (spec 2026-09-18 §3). Tre skydere, ét kald til
 * appens rigtige regelfunktion, én telefon. Ingen netværk: tallene
 * forlader aldrig browseren.
 *
 * Skyderne henter min, max og step fra `engine-demo`, så landingen
 * aldrig kan stille motoren et spørgsmål den ikke er bygget til.
 * Tommelfingeren er 44 px; den styles i `globals.css` (`.kalk-range`)
 * sammen med resten af Kalk.
 */
export default function EngineDemo() {
  const t = useTranslations("Marketing.kalk.demo");
  const [sliders, setSliders] = useState<DemoSliders>(DEMO_DEFAULTS);
  const result = runDemo(sliders);
  const set = (patch: Partial<DemoSliders>) => setSliders((s) => ({ ...s, ...patch }));
  const hours = `${Math.floor(sliders.sleep)} t ${sliders.sleep % 1 === 0 ? "00" : "30"} m`;

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
    <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
      <div className="flex w-full flex-col gap-5 lg:max-w-[320px]">
        {/* Ikke klassen "eyebrow": KalkHero.test.tsx kræver, at heroen ikke har en. */}
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

      <div aria-live="polite" className="w-full max-w-[300px] rounded-[44px] bg-fg p-2.5">
        <div className="overflow-hidden rounded-[36px] bg-bg">
          <div className="border-b border-line px-5 pb-3 pt-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">{t("todayLabel")}</p>
            <p className="font-display mt-1.5 text-3xl">{t("sessionTitle")}</p>
            <span className="sr-only">{announcement}</span>
          </div>
          <div className="flex flex-col gap-3.5 px-5 pb-6 pt-4">
            <div className="rounded-[14px] border border-line-strong bg-bg-2 p-4">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-fg-dim">{t("topSetLabel")}</p>
              <p className="mt-2 flex items-baseline gap-2.5">
                {result.changed ? (
                  <span className="strike-signal font-display text-3xl text-fg-faint">{DEMO_TOP_SET_KG}</span>
                ) : null}
                <span className="font-display text-5xl">{result.topSetKg}</span>
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
                over, som resten af telefonens brødtekst. */}
            <p className="border-t border-line pt-3 text-left text-[12px] text-fg-dim">{t("keepOriginal")}</p>
          </div>
        </div>
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
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-dim">
          {label}
        </label>
        <span className="font-display text-3xl">
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
