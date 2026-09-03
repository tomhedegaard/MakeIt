import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
import {
  checkLimit,
  describeNextAvailable,
  recordAction,
  type RateLimitStatus,
} from "@/lib/data/rate-limits";
import { maybeApplyKcalAdjustment } from "@/lib/data/kcal-adjustment";
import { getSkipDayIndices } from "@/lib/data/skip-days";
import MealCard from "./MealCard";
import GeneratePlanButton from "./GeneratePlanButton";
import LogMealButton from "./LogMealButton";
import LogWeightCard from "@/components/nutrition/LogWeightCard";
import SkipDaysCard from "@/components/nutrition/SkipDaysCard";
import DailyCheckInCard from "@/components/nutrition/DailyCheckInCard";
import DailyIntakeCard from "@/components/nutrition/DailyIntakeCard";
import OffPlanLogButton from "./OffPlanLogButton";
import { getDailyCheckIn } from "@/lib/data/nutrition-checkin";
import { getDailyIntake } from "@/lib/data/nutrition-intake";

export async function generateMetadata() {
  const t = await getTranslations("Nutrition");
  return { title: t("metaTitle") };
}

type T = Awaited<ReturnType<typeof getTranslations<"Nutrition">>>;

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export default async function NutritionPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const member = (await getSession())!;
  const t = await getTranslations("Nutrition");
  const weekStart = currentIsoMonday();
  // Cheap first-visit gate before the rest of the page's fetches so
  // /nutrition → /nutrition/setup is not a multi-second blank.
  const [profile, plan, latestWeight] = await Promise.all([
    getOrCreateNutritionProfile(member.id),
    getCurrentPlan(member.id),
    getLatestWeight(member.id),
  ]);
  const profileFresh =
    !plan &&
    !latestWeight &&
    (!profile?.goal || profile.goal === "maintain") &&
    !profile?.dailyKcalTarget;
  if (profileFresh) {
    redirect("/nutrition/setup");
  }

  const [
    checkin,
    intake,
    weightTrend,
    planLimit,
    swapLimit,
    skipDayIndices,
    kcalAdjustGate,
  ] = await Promise.all([
    getDailyCheckIn(member.id),
    getDailyIntake(member.id),
    getWeightTrend(member.id),
    checkLimit(member.id, "plan_regen"),
    checkLimit(member.id, "meal_swap"),
    getSkipDayIndices(member.id, weekStart),
    checkLimit(member.id, "kcal_adjustment"),
  ]);

  // Adaptive kcal adjustment — lazy evaluation on first /nutrition
  // visit of the new ISO week. The kcalAdjustGate check above
  // looks at member_action_logs for "kcal_adjustment" within the
  // last 7 days; if allowed=true, we haven't run this week yet.
  let kcalAdjust: { delta: number; reason: string | null } | null = null;
  if (kcalAdjustGate.allowed && profile.dailyKcalTarget) {
    const result = await maybeApplyKcalAdjustment(
      member.id,
      profile.goal,
      profile.dailyKcalTarget,
    );
    if (result.applied) {
      await recordAction(member.id, "kcal_adjustment", {
        delta: result.delta,
        new_target: result.newTarget,
        reason: result.reason,
      });
      kcalAdjust = { delta: result.delta, reason: result.reason };
    }
  }

  // First-time guard: only redirect when the profile is genuinely
  // untouched. The earlier `plan === null && latestWeight === null`
  // check looped users back to the wizard whenever either persist
  // step failed (Claude timeout + mock fallback DB hiccup, or
  // missing weight_logs migration making logWeight no-op). We now
  // gate on a single signal — has the member ever opened the
  // wizard — by checking whether onboarded_at on the profile is
  // null. The wizard sets the goal explicitly; if it's still at
  // the schema default AND there's no plan AND no weight, we know
  // they've never completed setup.
  const todayIndex = todayDayIndex();

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-domain mb-2">{t("page.eyebrow")}</div>
          <h1 className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[0.92]">
            {t("page.title")}
          </h1>
          <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
            {t("page.intro")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OffPlanLogButton />
          <Link
            href="/nutrition/shopping"
            className="btn btn-sm"
          >
            {t("page.shoppingLink")}
          </Link>
          <Link
            href="/nutrition/preferences"
            className="btn btn-ghost btn-sm"
          >
            {t("page.preferencesLink")}
          </Link>
        </div>
      </header>

      {err === "quota_plan" || err === "quota_swap" ? (
        <QuotaBanner
          kind={err === "quota_plan" ? "plan" : "swap"}
          limit={err === "quota_plan" ? planLimit : swapLimit}
          t={t}
        />
      ) : null}

      {kcalAdjust ? <KcalAdjustBanner delta={kcalAdjust.delta} reason={kcalAdjust.reason} t={t} /> : null}

      <DailyCheckInCard checkin={checkin} />

      <DailyIntakeCard intake={intake} />

      <LogWeightCard
        latestKg={latestWeight?.kg ?? null}
        latestLoggedAt={latestWeight?.loggedAt ?? null}
        deltaKg={weightTrend.deltaKg}
      />

      <SkipDaysCard weekStart={weekStart} skipDayIndices={skipDayIndices} />

      {plan === null ? (
        <EmptyState
          weekStart={weekStart}
          hasProfile={Boolean(profile)}
          planLimit={planLimit}
          t={t}
        />
      ) : (
        <PlanView
          plan={plan}
          todayIndex={todayIndex}
          fishPerWeek={profile.fishPerWeek}
          diet={profile.diet}
          planLimit={planLimit}
          swapLimit={swapLimit}
          t={t}
        />
      )}
    </Container>
  );
}

/* ---------------------------------------------------------------- *
 * Adaptive kcal adjustment banner — shown when this Monday's lazy
 * check fired. Surfaces what changed + why so the user sees the
 * system actively responding to their data rather than feeling like
 * a static plan.
 * ---------------------------------------------------------------- */

function KcalAdjustBanner({
  delta,
  reason,
  t,
}: {
  delta: number;
  reason: string | null;
  t: T;
}) {
  const sign = delta > 0 ? "+" : "";
  return (
    <div className="surface-2 rounded-xl border hairline-strong px-5 py-3 text-sm">
      <span className="eyebrow mr-2">{t("page.kcalAdjustEyebrow")}</span>
      {t.rich("page.kcalAdjustBody", {
        sign,
        delta,
        reason: reason ? t("page.kcalAdjustReason", { reason }) : "",
        strong: (chunks) => <strong className="text-fg">{chunks}</strong>,
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Quota error banner
 * ---------------------------------------------------------------- */

function QuotaBanner({
  kind,
  limit,
  t,
}: {
  kind: "plan" | "swap";
  limit: RateLimitStatus;
  t: T;
}) {
  const reset = describeNextAvailable(limit.nextAvailableAt);
  const label = kind === "plan" ? t("page.quotaLabelPlan") : t("page.quotaLabelSwap");
  return (
    <div className="surface-2 rounded-xl border border-warn/40 px-5 py-3 text-sm">
      <span className="eyebrow text-warn mr-2">{t("page.quotaEyebrow")}</span>
      {t("page.quotaBody", {
        label,
        dailyUsed: limit.daily.used,
        dailyMax: limit.daily.max,
        weeklyUsed: limit.weekly.used,
        weeklyMax: limit.weekly.max,
      })}
      {reset ? (
        <>
          {t.rich("page.quotaNext", {
            reset,
            strong: (chunks) => <strong className="text-fg">{chunks}</strong>,
          })}
        </>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Empty state — pre-generation
 * ---------------------------------------------------------------- */

function EmptyState({
  weekStart,
  hasProfile,
  planLimit,
  t,
}: {
  weekStart: string;
  hasProfile: boolean;
  planLimit: RateLimitStatus;
  t: T;
}) {
  const remaining = Math.max(
    0,
    Math.min(
      planLimit.daily.max - planLimit.daily.used,
      planLimit.weekly.max - planLimit.weekly.used,
    ),
  );
  const resetLabel = describeNextAvailable(planLimit.nextAvailableAt);
  return (
    <section className="surface-2 rounded-2xl p-6 lg:p-10 text-center max-w-2xl mx-auto">
      <div className="eyebrow mb-3">{t("page.emptyEyebrow", { week: weekStartLabel(weekStart) })}</div>
      <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-3">
        {t("page.emptyTitle")}
      </h2>
      <p className="text-fg-dim text-sm md:text-base max-w-md mx-auto mb-5">
        {t("page.emptyBody")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {hasProfile ? (
          <GeneratePlanButton
            label={t("page.emptyGenerate")}
            quotaRemaining={remaining}
            quotaResetLabel={resetLabel}
          />
        ) : null}
        <Link href="/nutrition/preferences" className="btn">
          {t("page.emptyPreferences")}
        </Link>
      </div>
      <p className="mt-4 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        {t("page.emptyQuota", {
          dailyUsed: planLimit.daily.used,
          dailyMax: planLimit.daily.max,
          weeklyUsed: planLimit.weekly.used,
          weeklyMax: planLimit.weekly.max,
        })}
      </p>
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
  planLimit,
  swapLimit,
  t,
}: {
  plan: Plan;
  todayIndex: number;
  fishPerWeek: number;
  diet: "omnivore" | "pescatarian" | "vegetarian" | "vegan";
  planLimit: RateLimitStatus;
  swapLimit: RateLimitStatus;
  t: T;
}) {
  const remaining = Math.max(
    0,
    Math.min(
      planLimit.daily.max - planLimit.daily.used,
      planLimit.weekly.max - planLimit.weekly.used,
    ),
  );
  const resetLabel = describeNextAvailable(planLimit.nextAvailableAt);
  const swapRemaining = Math.max(
    0,
    Math.min(
      swapLimit.daily.max - swapLimit.daily.used,
      swapLimit.weekly.max - swapLimit.weekly.used,
    ),
  );
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
        <Stat label={t("page.statKcal")} value={plan.dailyKcal ?? "—"} />
        <Stat label={t("page.statProtein")} value={plan.dailyProteinG ?? "—"} />
        <Stat label={t("page.statCarbs")} value={plan.dailyCarbsG ?? "—"} />
        <Stat label={t("page.statFat")} value={plan.dailyFatG ?? "—"} />
      </section>

      {/* Week strip */}
      <section
        aria-label={t("page.weekOverviewLabel")}
        className="-mx-6 md:mx-0 px-6 md:px-0 overflow-x-auto"
      >
        <ol className="flex gap-2 md:grid md:grid-cols-7 min-w-max md:min-w-0">
          {DAY_KEYS.map((dayKey, i) => {
            const isToday = i === todayIndex;
            const meals = byDay[i] ?? [];
            const dayKcal = meals.reduce((sum, m) => sum + (m.estKcal ?? 0), 0);
            return (
              <li key={dayKey} className="shrink-0 md:shrink">
                <a
                  href={`#day-${i}`}
                  className="block surface-2 rounded-xl p-3 md:p-4 w-[78px] md:w-auto text-center lift transition-colors"
                  style={{
                    background: isToday ? "var(--bg-3)" : undefined,
                    borderColor: isToday ? "var(--line-bright)" : undefined,
                  }}
                >
                  <div className="eyebrow mb-1.5">{t(`dayLabels.${dayKey}`)}</div>
                  <div className="numeric text-xl mb-1">{meals.length}</div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                    {t("page.meals")}
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
            <div className="eyebrow mb-1">{t("page.todayEyebrow", { day: t(`dayLabels.${DAY_KEYS[todayIndex]}`) })}</div>
            <h2 className="font-display text-3xl md:text-4xl leading-[1]">
              {today.length === 1
                ? t("page.todayMealsOne", { count: today.length })
                : t("page.todayMealsOther", { count: today.length })}
            </h2>
          </div>
          <span className="text-xs font-mono text-fg-faint">
            {t("page.todayMacros", {
              kcal: today.reduce((s, m) => s + (m.estKcal ?? 0), 0),
              protein: today.reduce((s, m) => s + (m.estProteinG ?? 0), 0),
            })}
          </span>
        </div>
        <ul className="space-y-3">
          {today.map((m) => (
            <li key={m.id}>
              <MealCard meal={m} loggable swapQuotaRemaining={swapRemaining} />
            </li>
          ))}
        </ul>
      </section>

      {/* Rest of week — collapsed by day */}
      <section className="space-y-3">
        <h2 className="eyebrow">{t("page.restOfWeek")}</h2>
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
                <div className="eyebrow w-12 shrink-0">{t(`dayLabels.${DAY_KEYS[i]}`)}</div>
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
                    <MealCard
                      meal={m}
                      loggable={false}
                      compact
                      swapQuotaRemaining={swapRemaining}
                    />
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
          <div className="eyebrow mb-3">{t("page.supplementsEyebrow")}</div>
          <p className="text-fg-dim text-xs mb-4 max-w-prose">
            {t("page.supplementsBody")}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {supplements.map((s) => (
              <li key={s.id} className="border hairline rounded-lg p-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="text-sm">{s.title}</div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                    {s.necessity === "high-value"
                      ? t("page.supplementStrong")
                      : s.necessity === "useful"
                      ? t("page.supplementUseful")
                      : t("page.supplementConsider")}
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
        <GeneratePlanButton
          label={t("page.regenerate")}
          variant="ghost"
          quotaRemaining={remaining}
          quotaResetLabel={resetLabel}
        />
        <LogMealButton dateIso={isoToday()} />
        <span className="text-[11px] font-mono text-fg-faint ml-auto">
          {plan.generator === "claude"
            ? t("page.generatedByClaude", { model: plan.generatorModel ?? "claude" })
            : t("page.generatedLocally")}
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
