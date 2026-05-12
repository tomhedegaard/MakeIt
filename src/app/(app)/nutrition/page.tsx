import Link from "next/link";
import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import {
  currentIsoMonday,
  getCurrentPlan,
  getOrCreateNutritionProfile,
  type Meal,
  type MealSlot,
  type Plan,
} from "@/lib/data/nutrition";
import { getLatestWeight, getWeightTrend } from "@/lib/data/weight";
import { suggestSupplements } from "@/lib/nutrition/brand";
import MealCard from "./MealCard";
import GeneratePlanButton from "./GeneratePlanButton";
import LogMealButton from "./LogMealButton";
import LogWeightCard from "@/components/nutrition/LogWeightCard";
import DailyCheckInCard from "@/components/nutrition/DailyCheckInCard";
import { getDailyCheckIn } from "@/lib/data/nutrition-checkin";

export const metadata = {
  title: "Mad — MakeIt",
};

const DAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

export default async function NutritionPage() {
  const member = (await getSession())!;
  const [profile, plan, checkin, latestWeight, weightTrend] = await Promise.all([
    getOrCreateNutritionProfile(member.id),
    getCurrentPlan(member.id),
    getDailyCheckIn(member.id),
    getLatestWeight(member.id),
    getWeightTrend(member.id),
  ]);

  // First-time visit (no plan, no weigh-in) → wizard. The wizard
  // itself also guards against a second visit by redirecting back
  // here once a plan exists.
  if (plan === null && latestWeight === null) {
    redirect("/nutrition/setup");
  }
  const todayIndex = todayDayIndex();

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">06 — Mad</div>
          <h1 className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[0.92]">
            Brændstof.
          </h1>
          <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
            AI-genereret ugeplan, holdt indenfor brand-rammen. Olivenolie og
            smør, ikke rapsolie. Skyr og hytteost, ikke proteinbarer. Hele varer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/nutrition/shopping"
            className="btn btn-sm"
          >
            Indkøbsliste
          </Link>
          <Link
            href="/nutrition/preferences"
            className="btn btn-ghost btn-sm"
          >
            Indstillinger
          </Link>
        </div>
      </header>

      <DailyCheckInCard checkin={checkin} />

      <LogWeightCard
        latestKg={latestWeight?.kg ?? null}
        latestLoggedAt={latestWeight?.loggedAt ?? null}
        deltaKg={weightTrend.deltaKg}
      />

      {plan === null ? (
        <EmptyState weekStart={currentIsoMonday()} hasProfile={Boolean(profile)} />
      ) : (
        <PlanView
          plan={plan}
          todayIndex={todayIndex}
          fishPerWeek={profile.fishPerWeek}
          diet={profile.diet}
        />
      )}
    </Container>
  );
}

/* ---------------------------------------------------------------- *
 * Empty state — pre-generation
 * ---------------------------------------------------------------- */

function EmptyState({ weekStart, hasProfile }: { weekStart: string; hasProfile: boolean }) {
  return (
    <section className="surface-2 rounded-2xl p-6 lg:p-10 text-center max-w-2xl mx-auto">
      <div className="eyebrow mb-3">Ingen plan for uge {weekStartLabel(weekStart)}</div>
      <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-3">
        Sæt rammen, så bygger AI&apos;en.
      </h2>
      <p className="text-fg-dim text-sm md:text-base max-w-md mx-auto mb-5">
        Når du har sat allergier, dislikes og foretrukne ingredienser, genererer
        vi en uge-plan med 21 måltider, indkøbsliste og prep-skema.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {hasProfile ? (
          <GeneratePlanButton label="Generér ugeplan" />
        ) : null}
        <Link href="/nutrition/preferences" className="btn">
          Sæt indstillinger →
        </Link>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * Plan view — week strip + today + days
 * ---------------------------------------------------------------- */

function PlanView({
  plan,
  todayIndex,
  fishPerWeek,
  diet,
}: {
  plan: Plan;
  todayIndex: number;
  fishPerWeek: number;
  diet: "omnivore" | "pescatarian" | "vegetarian" | "vegan";
}) {
  const byDay: Meal[][] = Array.from({ length: 7 }, () => []);
  for (const m of plan.meals) {
    if (m.dayIndex >= 0 && m.dayIndex < 7) byDay[m.dayIndex].push(m);
  }

  // Sort each day by slot order
  const slotOrder: MealSlot[] = ["morgen", "frokost", "aften", "snack", "pre", "post"];
  for (const day of byDay) {
    day.sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));
  }

  const today = byDay[todayIndex] ?? [];
  const supplements = suggestSupplements({
    fishPerWeek,
    diet,
    trainingDaysPerWeek: 4,
    isWinter: isWinter(),
  });

  return (
    <>
      {/* Macro / meta strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline rounded-lg overflow-hidden">
        <Stat label="Kcal / dag" value={plan.dailyKcal ?? "—"} />
        <Stat label="Protein g" value={plan.dailyProteinG ?? "—"} />
        <Stat label="Kulhydrat g" value={plan.dailyCarbsG ?? "—"} />
        <Stat label="Fedt g" value={plan.dailyFatG ?? "—"} />
      </section>

      {/* Week strip */}
      <section
        aria-label="Ugeoversigt"
        className="-mx-6 md:mx-0 px-6 md:px-0 overflow-x-auto"
      >
        <ol className="flex gap-2 md:grid md:grid-cols-7 min-w-max md:min-w-0">
          {DAY_LABELS.map((label, i) => {
            const isToday = i === todayIndex;
            const meals = byDay[i] ?? [];
            const dayKcal = meals.reduce((sum, m) => sum + (m.estKcal ?? 0), 0);
            return (
              <li key={label} className="shrink-0 md:shrink">
                <a
                  href={`#day-${i}`}
                  className="block surface-2 rounded-xl p-3 md:p-4 w-[78px] md:w-auto text-center lift transition-colors"
                  style={{
                    background: isToday ? "var(--bg-3)" : undefined,
                    borderColor: isToday ? "var(--line-bright)" : undefined,
                  }}
                >
                  <div className="eyebrow mb-1.5">{label}</div>
                  <div className="numeric text-xl mb-1">{meals.length}</div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                    måltider
                  </div>
                  <div className="numeric text-[11px] text-fg-dim mt-1.5">
                    {dayKcal > 0 ? `${dayKcal} kcal` : "—"}
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Today */}
      <section id={`day-${todayIndex}`}>
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="eyebrow mb-1">I dag · {DAY_LABELS[todayIndex]}</div>
            <h2 className="font-display text-3xl md:text-4xl leading-[1]">
              {today.length} måltid{today.length === 1 ? "" : "er"}
            </h2>
          </div>
          <span className="text-xs font-mono text-fg-faint">
            {today.reduce((s, m) => s + (m.estKcal ?? 0), 0)} kcal · {today.reduce((s, m) => s + (m.estProteinG ?? 0), 0)}g P
          </span>
        </div>
        <ul className="space-y-3">
          {today.map((m) => (
            <li key={m.id}>
              <MealCard meal={m} loggable />
            </li>
          ))}
        </ul>
      </section>

      {/* Rest of week — collapsed by day */}
      <section className="space-y-3">
        <h2 className="eyebrow">Resten af ugen</h2>
        {byDay.map((meals, i) => {
          if (i === todayIndex) return null;
          const dayKcal = meals.reduce((sum, m) => sum + (m.estKcal ?? 0), 0);
          return (
            <details
              key={i}
              id={`day-${i}`}
              className="surface-2 rounded-xl overflow-hidden group"
              open={i === todayIndex + 1}
            >
              <summary className="cursor-pointer flex items-center gap-4 px-5 py-4 list-none">
                <div className="eyebrow w-12 shrink-0">{DAY_LABELS[i]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">
                    {meals.map((m) => m.title).join(" · ")}
                  </div>
                </div>
                <div className="numeric text-xs text-fg-dim shrink-0">
                  {dayKcal} kcal
                </div>
                <span aria-hidden className="text-fg-faint group-open:rotate-90 transition-transform">→</span>
              </summary>
              <ul className="border-t hairline divide-y hairline">
                {meals.map((m) => (
                  <li key={m.id} className="px-5 py-4">
                    <MealCard meal={m} loggable={false} compact />
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </section>

      {/* Supplements */}
      {supplements.length > 0 ? (
        <section className="surface-2 rounded-2xl p-5 lg:p-6">
          <div className="eyebrow mb-3">Supplerings-nudge</div>
          <p className="text-fg-dim text-xs mb-4 max-w-prose">
            Vi anbefaler altid at få det fra mad. Disse er undtagelser hvor det
            er svært eller dyrt at hente nok fra tallerkenen alene.
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {supplements.map((s) => (
              <li key={s.id} className="border hairline rounded-lg p-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="text-sm">{s.title}</div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                    {s.necessity === "high-value" ? "Stærk" : s.necessity === "useful" ? "Nyttig" : "Overvej"}
                  </span>
                </div>
                <div className="text-xs text-fg-dim leading-relaxed">{s.why}</div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Footer actions */}
      <section className="flex flex-wrap items-center gap-2 pt-2">
        <GeneratePlanButton label="Regenerér ugeplan" variant="ghost" />
        <LogMealButton dateIso={isoToday()} />
        <span className="text-[11px] font-mono text-fg-faint ml-auto">
          {plan.generator === "claude" ? `Genereret af ${plan.generatorModel ?? "claude"}` : "Genereret lokalt (mock)"}
        </span>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-bg p-5">
      <div className="eyebrow mb-1.5">{label}</div>
      <div className="numeric text-2xl lg:text-3xl">{value}</div>
    </div>
  );
}

function todayDayIndex(): number {
  const day = new Date().getDay(); // 0=Sun, 1=Mon
  return day === 0 ? 6 : day - 1;
}

function isWinter(): boolean {
  const m = new Date().getMonth(); // 0=Jan
  return m >= 9 || m <= 3; // Oct (9) — Apr (3)
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekStartLabel(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00Z");
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return String(1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000)));
}
