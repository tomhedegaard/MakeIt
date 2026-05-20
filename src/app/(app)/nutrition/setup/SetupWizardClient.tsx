"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { completeSetupAction } from "../actions";
import PlanGenerationOverlay from "@/components/nutrition/PlanGenerationOverlay";

/**
 * Setup-wizard form, controlled. Selection is React state so the
 * filled radio + label highlight track immediately on click — the
 * earlier pure-CSS version relied on peer-checked which only works
 * for direct siblings (the visual circle was a grand-child, so it
 * never lit up).
 *
 * One form submit at the end. The action handles save + plan
 * generation + redirect; we just collect the four inputs.
 */
type Goal = "cut" | "recomp" | "maintain" | "mass";
type Diet = "omnivore" | "pescatarian" | "vegetarian" | "vegan";
type Cooking = "basic" | "intermediate" | "advanced";

export default function SetupWizardClient() {
  const t = useTranslations("Nutrition.setup");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [diet, setDiet] = useState<Diet>("omnivore");
  const [cooking, setCooking] = useState<Cooking>("basic");

  return (
    <form action={completeSetupAction} className="space-y-10">
      {/* Hidden inputs carry the React state through the submit. */}
      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="diet" value={diet} />
      <input type="hidden" name="cooking_level" value={cooking} />

      <Section
        num="01"
        title={t("goalTitle")}
        sub={t("goalSub")}
      >
        <Grid>
          {(
            [
              { id: "cut",      title: t("goalCutTitle"),      sub: t("goalCutSub") },
              { id: "recomp",   title: t("goalRecompTitle"),   sub: t("goalRecompSub") },
              { id: "maintain", title: t("goalMaintainTitle"), sub: t("goalMaintainSub") },
              { id: "mass",     title: t("goalMassTitle"),     sub: t("goalMassSub") },
            ] as { id: Goal; title: string; sub: string }[]
          ).map((o) => (
            <Choice
              key={o.id}
              checked={goal === o.id}
              onCheck={() => setGoal(o.id)}
              title={o.title}
              sub={o.sub}
            />
          ))}
        </Grid>
      </Section>

      <Section
        num="02"
        title={t("dietTitle")}
        sub={t("dietSub")}
      >
        <Grid>
          {(
            [
              { id: "omnivore",    title: t("dietOmnivoreTitle"),    sub: t("dietOmnivoreSub") },
              { id: "pescatarian", title: t("dietPescatarianTitle"), sub: t("dietPescatarianSub") },
              { id: "vegetarian",  title: t("dietVegetarianTitle"),  sub: t("dietVegetarianSub") },
              { id: "vegan",       title: t("dietVeganTitle"),       sub: t("dietVeganSub") },
            ] as { id: Diet; title: string; sub: string }[]
          ).map((o) => (
            <Choice
              key={o.id}
              checked={diet === o.id}
              onCheck={() => setDiet(o.id)}
              title={o.title}
              sub={o.sub}
            />
          ))}
        </Grid>
      </Section>

      <Section
        num="03"
        title={t("cookingTitle")}
        sub={t("cookingSub")}
      >
        <Grid>
          {(
            [
              { id: "basic",        title: t("cookingBasicTitle"),        sub: t("cookingBasicSub") },
              { id: "intermediate", title: t("cookingIntermediateTitle"), sub: t("cookingIntermediateSub") },
              { id: "advanced",     title: t("cookingAdvancedTitle"),     sub: t("cookingAdvancedSub") },
            ] as { id: Cooking; title: string; sub: string }[]
          ).map((o) => (
            <Choice
              key={o.id}
              checked={cooking === o.id}
              onCheck={() => setCooking(o.id)}
              title={o.title}
              sub={o.sub}
            />
          ))}
        </Grid>
      </Section>

      <Section
        num="04"
        title={t("weightTitle")}
        sub={t("weightSub")}
      >
        <label className="block max-w-xs">
          <span className="eyebrow block mb-2">{t("weightFieldLabel")}</span>
          <div className="relative">
            <input
              type="number"
              name="kg"
              required
              min="35"
              max="250"
              step="0.1"
              inputMode="decimal"
              placeholder="—"
              className="field text-2xl numeric pr-12"
              autoComplete="off"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono uppercase text-fg-faint">
              kg
            </span>
          </div>
        </label>
        <p className="mt-3 text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
          {t("weightTiming")}
        </p>
      </Section>

      <div className="border-t hairline pt-6 flex flex-wrap items-center gap-4">
        <SubmitButton />
        <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
          {t("submitTiming")}
        </p>
      </div>
    </form>
  );
}

/**
 * Pending state via useFormStatus — must be a child of the form so
 * the hook can read the submitting state of the enclosing <form>.
 * Disables the button + swaps the label so the user sees the
 * Claude generation is in flight rather than wondering whether
 * the click registered.
 */
function SubmitButton() {
  const t = useTranslations("Nutrition.setup");
  const { pending } = useFormStatus();
  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-xl flex-1 md:flex-none disabled:opacity-60"
      >
        {pending ? (
          <>
            <span className="inline-block size-2 rounded-full bg-current animate-pulse mr-2" />
            {t("submitting")}
          </>
        ) : (
          <>{t("submit")}</>
        )}
      </button>
      <PlanGenerationOverlay pending={pending} />
    </>
  );
}

/* ---------------------------- atoms ---------------------------- */

function Section({
  num,
  title,
  sub,
  children,
}: {
  num: string;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-2">
        <span className="numeric text-xs font-mono uppercase tracking-[0.16em] text-fg-faint">
          {num}
        </span>
        <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      </div>
      <p className="text-sm text-fg-dim mb-5 max-w-lg">{sub}</p>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

function Choice({
  checked,
  onCheck,
  title,
  sub,
}: {
  checked: boolean;
  onCheck: () => void;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onCheck}
      className={cn(
        "surface-2 rounded-2xl p-5 cursor-pointer touch-app text-left w-full transition-colors lift",
        checked && "bg-bg-3 border-line-bright"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "size-5 rounded-full border shrink-0 mt-0.5 transition-colors",
            checked ? "bg-fg border-fg" : "border-line-strong"
          )}
          aria-hidden
        />
        <div>
          <div className="font-display text-xl leading-[1.05] mb-1">{title}</div>
          <div className="text-sm text-fg-dim">{sub}</div>
        </div>
      </div>
    </button>
  );
}
