import Link from "next/link";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { getOrCreateNutritionProfile } from "@/lib/data/nutrition";
import { savePreferencesAction } from "../actions";

export const metadata = {
  title: "Mad · Indstillinger",
};

export default async function PreferencesPage() {
  const member = (await getSession())!;
  const profile = await getOrCreateNutritionProfile(member.id);

  return (
    <Container className="py-6 lg:py-12 max-w-2xl space-y-8">
      <header className="pt-2">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/nutrition"
            className="text-fg-dim hover:text-fg text-sm"
          >
            ← Mad
          </Link>
          <span className="text-fg-faint" aria-hidden>·</span>
          <span className="eyebrow">Indstillinger</span>
        </div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          Hvad spiser du.
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          Sæt rammerne én gang. AI&apos;en holder sig indenfor — ingen
          rapsolie, ingen UPF, ingen gæt.
        </p>
      </header>

      <form action={savePreferencesAction} className="space-y-8">
        {/* Goal */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-3">
          <div className="eyebrow">Mål</div>
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
                  {g === "cut" ? "Cut" : g === "recomp" ? "Recomp" : g === "mass" ? "Mass" : "Hold"}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] opacity-70 mt-0.5">
                  {g === "cut" ? "−400 kcal" : g === "recomp" ? "−150 kcal" : g === "mass" ? "+300 kcal" : "Stabil"}
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Diet */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-3">
          <div className="eyebrow">Kost</div>
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
                  {d === "omnivore" ? "Alt" : d === "pescatarian" ? "Fisk + plante" : d === "vegetarian" ? "Vegetar" : "Vegan"}
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Cooking & lifestyle */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-5">
          <div className="eyebrow">Køkken &amp; husstand</div>

          <Field label="Måltider pr. dag" hint="2–6">
            <input
              type="number"
              name="mealsPerDay"
              min={2}
              max={6}
              defaultValue={profile.mealsPerDay}
              className="input numeric w-24"
            />
          </Field>

          <Field label="Husstand" hint="Antal personer du laver mad til">
            <input
              type="number"
              name="householdSize"
              min={1}
              max={8}
              defaultValue={profile.householdSize}
              className="input numeric w-24"
            />
          </Field>

          <Field label="Fede fisk pr. uge" hint="Mål fra Sundhedsstyrelsen er 2-3">
            <input
              type="number"
              name="fishPerWeek"
              min={0}
              max={7}
              defaultValue={profile.fishPerWeek}
              className="input numeric w-24"
            />
          </Field>

          <Field label="Madlavnings-niveau">
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
                  {c === "basic" ? "Basis" : c === "intermediate" ? "Mellem" : "Avanceret"}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Budget">
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
                  {b === "lean" ? "Slankt" : b === "standard" ? "Standard" : "Premium"}
                </label>
              ))}
            </div>
          </Field>

          <Field
            label="Meal-prep mode"
            hint="Genbrug 2-3 måltider strategisk på tværs af ugen (samme frokost mandag + onsdag, samme aftensmad tirsdag + torsdag). Færre unikke meals = mindre prep + indkøb."
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
                Genbrug måltider for Sunday batch-cook
              </span>
            </label>
          </Field>
        </section>

        {/* Free-text lists */}
        <section className="surface-2 rounded-xl p-5 lg:p-6 space-y-5">
          <div className="eyebrow">Allergier &amp; præferencer</div>

          <Field
            label="Allergier"
            hint="Hard-stop. AI'en møder dem aldrig på tallerkenen. Adskil med komma."
          >
            <textarea
              name="allergies"
              rows={2}
              className="input w-full"
              placeholder="fx nødder, rejer, gluten"
              defaultValue={profile.allergies.join(", ")}
            />
          </Field>

          <Field
            label="Dislikes"
            hint="Undgås når der er alternativer. Adskil med komma."
          >
            <textarea
              name="dislikes"
              rows={2}
              className="input w-full"
              placeholder="fx koriander, lever, blåskimmelost"
              defaultValue={profile.dislikes.join(", ")}
            />
          </Field>

          <Field
            label="Foretrækker"
            hint="Boost. AI'en vælger oftere disse, alt andet lige."
          >
            <textarea
              name="preferences"
              rows={2}
              className="input w-full"
              placeholder="fx kylling, rugbrød, citrus, syrlig"
              defaultValue={profile.preferences.join(", ")}
            />
          </Field>
        </section>

        <div className="flex flex-wrap items-center gap-3 sticky bottom-3 surface-2 rounded-xl p-4 backdrop-blur">
          <button type="submit" className="btn btn-primary">
            Gem indstillinger
          </button>
          <Link href="/nutrition" className="btn btn-ghost">
            Annullér
          </Link>
          <span className="text-xs text-fg-faint font-mono ml-auto">
            Senest opdateret · {new Date(profile.updatedAt).toLocaleDateString("da-DK")}
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
