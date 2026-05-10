"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import Container from "@/components/Container";
import BrandHeading from "@/components/BrandHeading";
import { cn } from "@/lib/utils";
import { completeOnboardingAction } from "./actions";

type Goal = "strength" | "hypertrophy" | "hybrid" | "deadlift_spec";
type Level = "beginner" | "intermediate" | "advanced";
type Equip = "full" | "home_rack" | "minimal";

const GOAL_OPTS: { id: Goal; title: string; sub: string }[] = [
  { id: "strength",      title: "Strength",       sub: "Squat, bench, DL — bygge til nye PR'er" },
  { id: "hypertrophy",   title: "Hypertrofi",     sub: "Volumen og masse — flere reps, mere arbejde" },
  { id: "hybrid",        title: "Powerbuilding",  sub: "Begge dele — tunge top sets + accessory" },
  { id: "deadlift_spec", title: "Deadlift spec.", sub: "6 uger fokus på en ny PR i dødløftet" },
];

const LEVEL_OPTS: { id: Level; title: string; sub: string }[] = [
  { id: "beginner",     title: "Begynder",     sub: "< 1 år struktureret strength-træning" },
  { id: "intermediate", title: "Mellem",       sub: "1-3 år — kender RPE og periodisering" },
  { id: "advanced",     title: "Avanceret",    sub: "3+ år — kender din krops respons godt" },
];

const EQUIP_OPTS: { id: Equip; title: string; sub: string }[] = [
  { id: "full",      title: "Fuldt center",  sub: "Adgang til alt — kabler, maskiner, plads" },
  { id: "home_rack", title: "Hjemme + rack", sub: "Squat-rack, vægtstang, bænk og plader" },
  { id: "minimal",   title: "Minimum",       sub: "Håndvægte, måske en bænk og en stang" },
];

const FREQ_OPTS = [3, 4, 5] as const;

export default function OnboardingClient({
  memberHandle,
  err,
}: {
  memberHandle: string;
  err?: string;
}) {
  const [step, setStep] = useState(1);
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

        <Container size="narrow" className="py-8 lg:py-14 flex-1 space-y-10">
          {step === 1 ? (
            <>
              <Intro
                eyebrow={`Hej @${memberHandle}`}
                title="Lad os bygge dit program."
                sub="Vi spørger ind til dit mål, dit niveau og dit udstyr — så genererer AI'en et personligt program på 30 sekunder."
              />

              {err === "goal" || err === "level" || err === "equip" ? (
                <Banner>Vælg en option i hver gruppe.</Banner>
              ) : null}

              <Section eyebrow="Mål" title="Hvad sigter du efter?">
                <Grid>
                  {GOAL_OPTS.map((o) => (
                    <Choice
                      key={o.id}
                      name="goal"
                      value={o.id}
                      checked={goal === o.id}
                      onCheck={() => setGoal(o.id)}
                      title={o.title}
                      sub={o.sub}
                    />
                  ))}
                </Grid>
              </Section>

              <Section eyebrow="Niveau" title="Hvor er du henne?">
                <Grid>
                  {LEVEL_OPTS.map((o) => (
                    <Choice
                      key={o.id}
                      name="experience"
                      value={o.id}
                      checked={level === o.id}
                      onCheck={() => setLevel(o.id)}
                      title={o.title}
                      sub={o.sub}
                    />
                  ))}
                </Grid>
              </Section>

              <Section eyebrow="Frekvens" title="Hvor ofte træner du?">
                <div className="grid grid-cols-3 gap-2">
                  {FREQ_OPTS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      data-active={freq === f}
                      onClick={() => setFreq(f)}
                      className="pill touch-app h-12"
                    >
                      {f} dage / uge
                    </button>
                  ))}
                </div>
              </Section>

              <Section eyebrow="Udstyr" title="Hvad har du adgang til?">
                <Grid>
                  {EQUIP_OPTS.map((o) => (
                    <Choice
                      key={o.id}
                      name="equipment"
                      value={o.id}
                      checked={equip === o.id}
                      onCheck={() => setEquip(o.id)}
                      title={o.title}
                      sub={o.sub}
                    />
                  ))}
                </Grid>
              </Section>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Intro
                eyebrow="Maxes"
                title="Hvor stærk er du i dag?"
                sub="Indtast dit ~1RM for hver løft hvis du kender det. Spring over hvis ikke — vi bruger gennemsnit til dit niveau som start."
              />

              <div className="grid grid-cols-2 gap-3">
                <NumField name="maxSquat"    label="Squat"      placeholder="—" />
                <NumField name="maxBench"    label="Bench"      placeholder="—" />
                <NumField name="maxDeadlift" label="Deadlift"   placeholder="—" />
                <NumField name="maxOhp"      label="OHP"        placeholder="—" />
              </div>

              <p className="text-xs font-mono text-fg-faint">
                Alle felter i kg · Du kan altid opdatere dem senere på din profil.
              </p>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <Intro
                eyebrow="Sidste"
                title="Noget vi skal vide?"
                sub="Skader, mobilitetsproblemer eller ting du gerne vil arbejde rundt om. Helt valgfrit."
              />

              <label className="block">
                <span className="eyebrow block mb-2">Skader / noter</span>
                <textarea
                  name="injuries"
                  rows={4}
                  className="field py-3 min-h-[120px] resize-none w-full"
                  placeholder="F.eks. Lidt anstrengt højre skulder — undgå behind-the-neck press."
                />
              </label>

              <Summary
                goal={goal}
                level={level}
                freq={freq}
                equip={equip}
              />

              <p className="text-xs font-mono text-fg-faint">
                Når du trykker Færdig, genererer vi dit program og lægger
                første session ind på din Today-skærm.
              </p>
            </>
          ) : null}
        </Container>

        {/* Sticky CTA */}
        <div
          className="sticky bottom-0 z-30 border-t hairline bg-bg/95 backdrop-blur"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <Container size="narrow" className="pt-3 flex items-center gap-3">
            {step > 1 ? (
              <button
                type="button"
                className="btn"
                onClick={() => setStep(step - 1)}
              >
                Tilbage
              </button>
            ) : null}
            {step < totalSteps ? (
              <button
                type="button"
                className="btn btn-primary btn-xl flex-1"
                onClick={() => setStep(step + 1)}
                disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              >
                Næste →
              </button>
            ) : (
              <button type="submit" className="btn btn-primary btn-xl flex-1">
                Generér mit program →
              </button>
            )}
          </Container>
        </div>
      </form>
    </div>
  );
}

/* ------------------- atoms ------------------- */

function Intro({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div>
      <div className="eyebrow mb-3">{eyebrow}</div>
      <BrandHeading className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[0.92] mb-4">
        {title}
      </BrandHeading>
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
  const rows = [
    { k: "Mål",      v: GOAL_OPTS.find((o) => o.id === goal)?.title ?? "—" },
    { k: "Niveau",   v: LEVEL_OPTS.find((o) => o.id === level)?.title ?? "—" },
    { k: "Frekvens", v: `${freq} dage / uge` },
    { k: "Udstyr",   v: EQUIP_OPTS.find((o) => o.id === equip)?.title ?? "—" },
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
