import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { getOrCreateNutritionProfile } from "@/lib/data/nutrition";
import { savePreferencesAction } from "../actions";

export async function generateMetadata() {
  const t = await getTranslations("Nutrition.preferences");
  return { title: t("metaTitle") };
}

export default async function PreferencesPage() {
  const member = (await getSession())!;
  const profile = await getOrCreateNutritionProfile(member.id);
  const t = await getTranslations("Nutrition.preferences");

  return (
    <Container className="py-6 lg:py-12 max-w-2xl space-y-8">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/nutrition"
            className="text-fg-dim hover:text-fg text-sm"
          >
            {t("back")}
          </Link>
          <span className="text-fg-faint" aria-hidden>·</span>
          <span className="eyebrow">{t("eyebrow")}</span>
        </div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {t("title")}
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          {t("intro")}
        </p>
      </header>

      <form action={savePreferencesAction} className="space-y-8">
        {/* Goal */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-3">
          <div className="eyebrow">{t("goalEyebrow")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(["cut", "recomp", "maintain", "mass"] as const).map((g) => (
              <label
                key={g}
                className="bg-bg-3 border hairline rounded-lg px-3 py-3 text-center cursor-pointer has-[:checked]:bg-fg has-[:checked]:text-bg has-[:checked]:border-fg transition-colors"
              >
                <input
                  type="radio"
                  name="goal"
                  value={g}
                  defaultChecked={profile.goal === g}
                  className="sr-only"
                />
                <div className="text-sm">
                  {g === "cut" ? t("goalCut") : g === "recomp" ? t("goalRecomp") : g === "mass" ? t("goalMass") : t("goalMaintain")}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] opacity-70 mt-0.5">
                  {g === "cut" ? t("goalCutDelta") : g === "recomp" ? t("goalRecompDelta") : g === "mass" ? t("goalMassDelta") : t("goalMaintainDelta")}
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Diet */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-3">
          <div className="eyebrow">{t("dietEyebrow")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(["omnivore", "pescatarian", "vegetarian", "vegan"] as const).map((d) => (
              <label
                key={d}
                className="bg-bg-3 border hairline rounded-lg px-3 py-3 text-center cursor-pointer has-[:checked]:bg-fg has-[:checked]:text-bg has-[:checked]:border-fg transition-colors"
              >
                <input
                  type="radio"
                  name="diet"
                  value={d}
                  defaultChecked={profile.diet === d}
                  className="sr-only"
                />
                <div className="text-sm capitalize">
                  {d === "omnivore" ? t("dietOmnivore") : d === "pescatarian" ? t("dietPescatarian") : d === "vegetarian" ? t("dietVegetarian") : t("dietVegan")}
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Cooking & lifestyle */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-5">
          <div className="eyebrow">{t("kitchenEyebrow")}</div>

          <Field label={t("mealsPerDayLabel")} hint={t("mealsPerDayHint")}>
            <input
              type="number"
              name="mealsPerDay"
              min={2}
              max={6}
              defaultValue={profile.mealsPerDay}
              className="input numeric w-24"
            />
          </Field>

          <Field label={t("householdLabel")} hint={t("householdHint")}>
            <input
              type="number"
              name="householdSize"
              min={1}
              max={8}
              defaultValue={profile.householdSize}
              className="input numeric w-24"
            />
          </Field>

          <Field label={t("fishLabel")} hint={t("fishHint")}>
            <input
              type="number"
              name="fishPerWeek"
              min={0}
              max={7}
              defaultValue={profile.fishPerWeek}
              className="input numeric w-24"
            />
          </Field>

          <Field label={t("cookingLabel")}>
            <div className="flex gap-2">
              {(["basic", "intermediate", "advanced"] as const).map((c) => (
                <label
                  key={c}
                  className="flex-1 bg-bg-3 border hairline rounded-lg px-3 py-2 text-center cursor-pointer has-[:checked]:bg-fg has-[:checked]:text-bg has-[:checked]:border-fg transition-colors text-sm"
                >
                  <input
                    type="radio"
                    name="cookingLevel"
                    value={c}
                    defaultChecked={profile.cookingLevel === c}
                    className="sr-only"
                  />
                  {c === "basic" ? t("cookingBasic") : c === "intermediate" ? t("cookingIntermediate") : t("cookingAdvanced")}
                </label>
              ))}
            </div>
          </Field>

          <Field label={t("budgetLabel")}>
            <div className="flex gap-2">
              {(["lean", "standard", "premium"] as const).map((b) => (
                <label
                  key={b}
                  className="flex-1 bg-bg-3 border hairline rounded-lg px-3 py-2 text-center cursor-pointer has-[:checked]:bg-fg has-[:checked]:text-bg has-[:checked]:border-fg transition-colors text-sm"
                >
                  <input
                    type="radio"
                    name="budgetLevel"
                    value={b}
                    defaultChecked={profile.budgetLevel === b}
                    className="sr-only"
                  />
                  {b === "lean" ? t("budgetLean") : b === "standard" ? t("budgetStandard") : t("budgetPremium")}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label={t("mealPrepLabel")}
            hint={t("mealPrepHint")}
          >
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="mealPrepMode"
                value="1"
                defaultChecked={profile.mealPrepMode}
                className="size-5 accent-fg"
              />
              <span className="text-sm">
                {t("mealPrepCheckbox")}
              </span>
            </label>
          </Field>
        </section>

        {/* Free-text lists */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-5">
          <div className="eyebrow">{t("listsEyebrow")}</div>

          <Field
            label={t("allergiesLabel")}
            hint={t("allergiesHint")}
          >
            <textarea
              name="allergies"
              rows={2}
              className="input w-full"
              placeholder={t("allergiesPlaceholder")}
              defaultValue={profile.allergies.join(", ")}
            />
          </Field>

          <Field
            label={t("dislikesLabel")}
            hint={t("dislikesHint")}
          >
            <textarea
              name="dislikes"
              rows={2}
              className="input w-full"
              placeholder={t("dislikesPlaceholder")}
              defaultValue={profile.dislikes.join(", ")}
            />
          </Field>

          <Field
            label={t("preferencesLabel")}
            hint={t("preferencesHint")}
          >
            <textarea
              name="preferences"
              rows={2}
              className="input w-full"
              placeholder={t("preferencesPlaceholder")}
              defaultValue={profile.preferences.join(", ")}
            />
          </Field>
        </section>

        <div className="flex flex-wrap items-center gap-3 sticky bottom-3 surface-2 rounded-xl p-4 backdrop-blur">
          <button type="submit" className="btn btn-primary">
            {t("save")}
          </button>
          <Link href="/nutrition" className="btn btn-ghost">
            {t("cancel")}
          </Link>
          <span className="text-xs text-fg-faint font-mono ml-auto">
            {t("lastUpdated", { date: new Date(profile.updatedAt).toLocaleDateString("da-DK") })}
          </span>
        </div>
      </form>
    </Container>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <div className="text-sm">{label}</div>
      {hint ? <div className="text-xs text-fg-faint">{hint}</div> : null}
      <div>{children}</div>
    </label>
  );
}
