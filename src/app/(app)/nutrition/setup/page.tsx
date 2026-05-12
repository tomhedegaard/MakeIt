import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { getCurrentPlan, getNutritionProfile } from "@/lib/data/nutrition";
import { completeSetupAction } from "../actions";

export const metadata = {
  title: "Sæt din meal plan op — MakeIt",
};

/**
 * Setup-wizard for the meal planner. Renders only on first visit:
 * if the member already has a current plan OR has touched their
 * profile (goal already chosen), we bounce them to /nutrition since
 * they're past the wizard phase. Edits afterward go through
 * /nutrition/preferences which exposes the full power-user form.
 *
 * KISS shape: 4 questions on a single page, one submit, one Claude
 * call kicked off in the action. No multi-step state machine, no
 * back-button gymnastics, no half-saved drafts.
 */
export default async function NutritionSetupPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const [profile, plan] = await Promise.all([
    getNutritionProfile(member.id),
    getCurrentPlan(member.id),
  ]);

  // "Already onboarded into the planner" = has a plan, OR has
  // explicitly set a non-default goal. The blank profile state has
  // goal='maintain' as default — we treat 'maintain' as
  // "untouched" only when there's no plan yet.
  const alreadySetUp = plan !== null;
  if (alreadySetUp) redirect("/nutrition");

  return (
    <main className="relative z-10 flex-1 py-12 md:py-20">
      <Container size="narrow">
        <header className="mb-10">
          <div className="eyebrow mb-3">Setup · 90 sekunder</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,4rem)] leading-[0.95] mb-4">
            Sæt rammen.
            <br /> Vi bygger planen.
          </h1>
          <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
            Fire valg — så genererer AI&apos;en din første uge med opskrifter,
            macros og indkøbsliste. Du kan justere alt senere under
            indstillinger.
          </p>
        </header>

        <form action={completeSetupAction} className="space-y-10">
          <Section
            num="01"
            title="Hvad er målet?"
            sub="Vi tilpasser kalorier og protein efter retningen."
          >
            <Grid>
              {[
                { id: "cut",      title: "Cut",       sub: "Tabe fedt mens du beholder muskelmasse." },
                { id: "recomp",   title: "Recomp",    sub: "Bytte fedt for muskel — samme vægt, anden krop." },
                { id: "maintain", title: "Maintain",  sub: "Performance og restitution i centrum." },
                { id: "mass",     title: "Mass",      sub: "Tage på i kontrollerede skridt." },
              ].map((o) => (
                <Choice key={o.id} name="goal" value={o.id} title={o.title} sub={o.sub} defaultChecked={o.id === "maintain"} />
              ))}
            </Grid>
          </Section>

          <Section
            num="02"
            title="Hvilken diæt?"
            sub="Vi vælger kun proteiner og opskrifter der matcher."
          >
            <Grid>
              {[
                { id: "omnivore",     title: "Omnivore",     sub: "Alt på bordet — kød, fisk, æg, planter." },
                { id: "pescatarian",  title: "Pescatarian",  sub: "Fisk og planter, ingen landdyr." },
                { id: "vegetarian",   title: "Vegetarian",   sub: "Mejeri, æg og planter — ingen kød." },
                { id: "vegan",        title: "Vegan",        sub: "100% planter." },
              ].map((o) => (
                <Choice key={o.id} name="diet" value={o.id} title={o.title} sub={o.sub} defaultChecked={o.id === "omnivore"} />
              ))}
            </Grid>
          </Section>

          <Section
            num="03"
            title="Hvor meget vil du lave mad?"
            sub="Styrer hvor avancerede opskrifter vi vælger."
          >
            <Grid>
              {[
                { id: "basic",        title: "Minimal",       sub: "20 min eller mindre per måltid, ingen specialudstyr." },
                { id: "intermediate", title: "Moderate",      sub: "OK med 30-45 min og lidt prep i weekenden." },
                { id: "advanced",     title: "Love it",       sub: "Gerne mere tid + teknik — sous vide, low-roast, alt." },
              ].map((o) => (
                <Choice key={o.id} name="cooking_level" value={o.id} title={o.title} sub={o.sub} defaultChecked={o.id === "basic"} />
              ))}
            </Grid>
          </Section>

          <Section
            num="04"
            title="Hvad vejer du nu?"
            sub="Vi bruger det til at sigte rigtigt på kalorier + protein. Du kan opdatere ugentligt på dashboardet."
          >
            <label className="block max-w-xs">
              <span className="eyebrow block mb-2">Bodyweight</span>
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
              Bedste timing: morgen, fastet, efter toilet
            </p>
          </Section>

          <div className="border-t hairline pt-6 flex flex-wrap items-center gap-4">
            <button type="submit" className="btn btn-primary btn-xl flex-1 md:flex-none">
              Generér min plan →
            </button>
            <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
              Tager 5-10 sek · Claude bygger ugen
            </p>
          </div>
        </form>
      </Container>
    </main>
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
  name,
  value,
  title,
  sub,
  defaultChecked,
}: {
  name: string;
  value: string;
  title: string;
  sub: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="surface-2 rounded-2xl p-5 cursor-pointer touch-app block lift has-[:checked]:bg-bg-3 has-[:checked]:border-line-bright transition-colors">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only peer"
      />
      <div className="flex items-start gap-3">
        <span
          className="size-5 rounded-full border shrink-0 mt-0.5 border-line-strong peer-checked:bg-fg peer-checked:border-fg"
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
