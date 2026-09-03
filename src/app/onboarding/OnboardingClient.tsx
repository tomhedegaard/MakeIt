"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import Logo from "@/components/Logo";
import Container from "@/components/Container";
import PlanGenerationOverlay from "@/components/nutrition/PlanGenerationOverlay";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "./actions";

type Goal = "strength" | "hypertrophy" | "hybrid" | "deadlift_spec";
type Level = "beginner" | "intermediate" | "advanced";
type Equip = "full" | "home_rack" | "minimal";

const GOAL_IDS: Goal[] = ["strength", "hypertrophy", "hybrid", "deadlift_spec"];
const LEVEL_IDS: Level[] = ["beginner", "intermediate", "advanced"];
const EQUIP_IDS: Equip[] = ["full", "home_rack", "minimal"];

const FREQ_OPTS = [3, 4, 5] as const;

export default function OnboardingClient({
  memberHandle,
  err,
}: {
  memberHandle: string;
  err?: string;
}) {
  const t = useTranslations("Onboarding");
  const [step, setStep] = useState(
    err === "save" || err === "auth" || err === "gen" || err === "freq" ? 3 : 1,
  );
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [freq, setFreq] = useState<number>(4);
  const [equip, setEquip] = useState<Equip | null>(null);

  const totalSteps = 3;
  const canNext1 = goal && level && equip;
  const canNext2 = true; // 1RMs are optional

  return (
    <div className="minh-dvh flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur border-b hairline">
        <Container className="h-14 flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint">
              {step} / {totalSteps}
            </span>
          </div>
        </Container>
        <div className="h-1 bg-bg-3 overflow-hidden">
          <div
            className="h-full bg-fg transition-all duration-500"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </header>

      <form action={completeOnboardingAction} className="flex-1 flex flex-col">
        {/* Persisted state across step navigation. Step 1's radio inputs only
            render when step === 1, so without these the form would submit
            blank goal/experience/equipment when the user clicks Generér on
            step 3. Frequency already had a hidden input below; pulled that
            up here for consistency. */}
        <input type="hidden" name="goal" value={goal ?? ""} />
        <input type="hidden" name="experience" value={level ?? ""} />
        <input type="hidden" name="equipment" value={equip ?? ""} />
        <input type="hidden" name="frequency" value={freq} />

        <Container size="narrow" className="py-8 lg:py-14 flex-1 space-y-10 pb-28 lg:pb-10">
          {err === "goal" || err === "level" || err === "equip" ? (
            <Banner>{t("step1.errorBanner")}</Banner>
          ) : null}
          {err === "save" ? <Banner>{t("step3.errorSave")}</Banner> : null}
          {err === "auth" ? <Banner>{t("step3.errorAuth")}</Banner> : null}
          {err === "gen" ? <Banner>{t("step3.errorGen")}</Banner> : null}
          {err === "freq" ? <Banner>{t("step3.errorFreq")}</Banner> : null}

          {step === 1 ? (
            <>
              <Intro
                eyebrow={t("step1.introEyebrow", { handle: memberHandle })}
                title={t("step1.introTitle")}
                sub={t("step1.introSub")}
              />

              <Section eyebrow={t("step1.goalEyebrow")} title={t("step1.goalTitle")}>
                <Grid>
                  {GOAL_IDS.map((id) => (
                    <Choice
                      key={id}
                      name="goal"
                      value={id}
                      checked={goal === id}
                      onCheck={() => setGoal(id)}
                      title={t(`goals.${id}.title`)}
                      sub={t(`goals.${id}.sub`)}
                    />
                  ))}
                </Grid>
              </Section>

              <Section eyebrow={t("step1.levelEyebrow")} title={t("step1.levelTitle")}>
                <Grid>
                  {LEVEL_IDS.map((id) => (
                    <Choice
                      key={id}
                      name="experience"
                      value={id}
                      checked={level === id}
                      onCheck={() => setLevel(id)}
                      title={t(`levels.${id}.title`)}
                      sub={t(`levels.${id}.sub`)}
                    />
                  ))}
                </Grid>
              </Section>

              <Section eyebrow={t("step1.freqEyebrow")} title={t("step1.freqTitle")}>
                <div className="grid grid-cols-3 gap-2">
                  {FREQ_OPTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      data-active={freq === f}
                      onClick={() => setFreq(f)}
                      className="pill touch-app h-12"
                    >
                      {t("freqOption", { days: f })}
                    </button>
                  ))}
                </div>
              </Section>

              <Section eyebrow={t("step1.equipEyebrow")} title={t("step1.equipTitle")}>
                <Grid>
                  {EQUIP_IDS.map((id) => (
                    <Choice
                      key={id}
                      name="equipment"
                      value={id}
                      checked={equip === id}
                      onCheck={() => setEquip(id)}
                      title={t(`equipment.${id}.title`)}
                      sub={t(`equipment.${id}.sub`)}
                    />
                  ))}
                </Grid>
              </Section>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Intro
                eyebrow={t("step2.introEyebrow")}
                title={t("step2.introTitle")}
                sub={t("step2.introSub")}
              />

              <div className="grid grid-cols-2 gap-3">
                <NumField name="maxSquat"    label={t("step2.squat")}    placeholder="—" />
                <NumField name="maxBench"    label={t("step2.bench")}    placeholder="—" />
                <NumField name="maxDeadlift" label={t("step2.deadlift")} placeholder="—" />
                <NumField name="maxOhp"      label={t("step2.ohp")}      placeholder="—" />
              </div>

              <p className="text-xs font-mono text-fg-faint">
                {t("step2.footnote")}
              </p>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Intro
                eyebrow={t("step3.introEyebrow")}
                title={t("step3.introTitle")}
                sub={t("step3.introSub")}
              />

              <label className="block">
                <span className="eyebrow block mb-2">{t("step3.injuriesLabel")}</span>
                <textarea
                  name="injuries"
                  rows={4}
                  className="field py-3 min-h-[120px] resize-none w-full"
                  placeholder={t("step3.injuriesPlaceholder")}
                />
              </label>

              <Summary
                goal={goal}
                level={level}
                freq={freq}
                equip={equip}
              />

              <p className="text-xs font-mono text-fg-faint">
                {t("step3.footnote")}
              </p>
              <p className="text-xs font-mono text-fg-faint">
                {t("step3.submitTiming")}
              </p>
            </>
          ) : null}
        </Container>

        {/* Sticky on mobile so DONE stays tappable; static on desktop so
            NEXT does not cover GOAL cards. Content has pb-28 on small
            screens to keep the last cards above the bar. */}
        <div
          className="sticky bottom-0 lg:static z-30 border-t hairline bg-bg/95 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <Container size="narrow" className="pt-3 flex items-center gap-3">
            <OnboardingNav
              step={step}
              totalSteps={totalSteps}
              canNext1={!!canNext1}
              canNext2={canNext2}
              onBack={() => setStep(step - 1)}
              onNext={() => setStep(step + 1)}
            />
          </Container>
        </div>
      </form>
    </div>
  );
}

function OnboardingNav({
  step,
  totalSteps,
  canNext1,
  canNext2,
  onBack,
  onNext,
}: {
  step: number;
  totalSteps: number;
  canNext1: boolean;
  canNext2: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("Onboarding");
  const { pending } = useFormStatus();

  return (
    <>
      {step > 1 ? (
        <button
          type="button"
          className="btn"
          onClick={onBack}
          disabled={pending}
        >
          {t("nav.back")}
        </button>
      ) : null}
      {step < totalSteps ? (
        <button
          type="button"
          className="btn btn-primary btn-xl flex-1"
          onClick={onNext}
          disabled={pending || (step === 1 && !canNext1) || (step === 2 && !canNext2)}
        >
          {t("nav.next")}
        </button>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary btn-xl flex-1 disabled:opacity-60"
        >
          {pending ? (
            <>
              <span className="inline-block size-2 rounded-full bg-current animate-pulse mr-2" />
              {t("nav.submitting")}
            </>
          ) : (
            t("nav.submit")
          )}
        </button>
      )}
      <PlanGenerationOverlay
        pending={pending}
        namespace="Onboarding.programOverlay"
      />
    </>
  );
}

/* ------------------- atoms ------------------- */

function Intro({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div>
      <div className="eyebrow mb-3">{eyebrow}</div>
      <h1 className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[0.92] mb-4">
        {title}
      </h1>
      <p className="text-fg-dim text-base md:text-lg max-w-md leading-relaxed">{sub}</p>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="eyebrow mb-2">{eyebrow}</div>
      <h2 className="font-display text-2xl md:text-3xl mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Choice({
  name, value, checked, onCheck, title, sub,
}: {
  name: string;
  value: string;
  checked: boolean;
  onCheck: () => void;
  title: string;
  sub: string;
}) {
  return (
    <label
      className={cn(
        "surface-2 rounded-2xl p-5 cursor-pointer touch-app block lift",
      )}
      style={{
        background: checked ? "var(--bg-3)" : undefined,
        borderColor: checked ? "var(--line-bright)" : undefined,
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onCheck}
        className="sr-only"
      />
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "size-5 rounded-full border shrink-0 mt-0.5",
            checked ? "bg-fg border-fg" : "border-line-strong"
          )}
          aria-hidden
        />
        <div>
          <div className="font-display text-xl leading-[1.05] mb-1">{title}</div>
          <div className="text-sm text-fg-dim">{sub}</div>
        </div>
      </div>
    </label>
  );
}

function NumField({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="eyebrow block mb-2">{label}</span>
      <div className="relative">
        <input
          name={name}
          type="number"
          step="2.5"
          min="0"
          max="600"
          inputMode="decimal"
          className="field text-2xl numeric pr-10"
          placeholder={placeholder}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-fg-faint uppercase">
          kg
        </span>
      </div>
    </label>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-2 rounded-lg px-4 py-3 text-sm font-mono uppercase tracking-[0.14em]">
      · {children}
    </div>
  );
}

function Summary({
  goal, level, freq, equip,
}: {
  goal: Goal | null;
  level: Level | null;
  freq: number;
  equip: Equip | null;
}) {
  const t = useTranslations("Onboarding");
  const rows = [
    { k: t("summary.goal"),  v: goal ? t(`goals.${goal}.title`) : "—" },
    { k: t("summary.level"), v: level ? t(`levels.${level}.title`) : "—" },
    { k: t("summary.freq"),  v: t("freqOption", { days: freq }) },
    { k: t("summary.equip"), v: equip ? t(`equipment.${equip}.title`) : "—" },
  ];
  return (
    <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
      {rows.map((r) => (
        <li key={r.k} className="px-4 py-3 flex items-center gap-4 text-sm">
          <span className="eyebrow w-24 shrink-0">{r.k}</span>
          <span className="flex-1">{r.v}</span>
        </li>
      ))}
    </ul>
  );
}
