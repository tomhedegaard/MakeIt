import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocaleTag } from "@/i18n/config";
import { formatNumber } from "@/lib/utils";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
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
import { getMemberBody } from "@/lib/data/body";
import { isMealEstimateEnabled } from "./actions";
import { getDailyCheckIn } from "@/lib/data/nutrition-checkin";
import { getDailyIntake } from "@/lib/data/nutrition-intake";
import { isNutritionProfileFresh } from "@/lib/nutrition/profile-fresh";
import NutritionSetupView from "./setup/NutritionSetupView";

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
  const weekStart = currentIsoMonday();
  // Cheap first-visit gate before the rest of the page's fetches.
  // Render the wizard here — do not bounce to the setup path.
  // A server redirect() after this await commits an empty stub on
  // client navigations (Next.js App Router), which is the blank
  // flash Testy hit on the Kost tab.
  const [profile, plan, latestWeight] = await Promise.all([
    getOrCreateNutritionProfile(member.id),
    getCurrentPlan(member.id),
    getLatestWeight(member.id),
  ]);
  if (isNutritionProfileFresh({ plan, latestWeight, profile })) {
    return <NutritionSetupView />;
  }

  const t = await getTranslations("Nutrition");
  const tag = intlLocaleTag(await getLocale());
  const fmt = (n: number) => formatNumber(n, tag);

  const [
    checkin,
    intake,
    weightTrend,
    planLimit,
    swapLimit,
    skipDayIndices,
    kcalAdjustGate,
    body,
  ] = await Promise.all([
    getDailyCheckIn(member.id),
    getDailyIntake(member.id),
    getWeightTrend(member.id),
    checkLimit(member.id, "plan_regen"),
    checkLimit(member.id, "meal_swap"),
    getSkipDayIndices(member.id, weekStart),
    checkLimit(member.id, "kcal_adjustment"),
    getMemberBody(member.id),
  ]);
  // "Vis ikke kalorier og vægt" (spec §S): HQ still plans from the numbers.
  const hide = body.hideNumbers;

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

  const todayIndex = todayDayIndex();

  return (
    <>
      <PageHeader
        eyebrow={t("page.eyebrow")}
        title={t("page.title")}
        subtitle={t("page.intro")}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <OffPlanLogButton estimateEnabled={await isMealEstimateEnabled(member)} hideNumbers={hide} />
            <Link href="/nutrition/shopping" className="btn btn-sm">
              {t("page.shoppingLink")}
            </Link>
            <Link href="/nutrition/preferences" className="btn btn-ghost btn-sm">
              {t("page.preferencesLink")}
            </Link>
          </div>
        }
      />
      {/* Bottom room under lg: the floating "+ Spiste noget andet" button
          must not sit on top of the footer line when scrolled to the end. */}
      <Container className="py-8 pb-28 lg:py-12 space-y-8">
      {err === "quota_plan" || err === "quota_swap" ? (
        <QuotaBanner
          kind={err === "quota_plan" ? "plan" : "swap"}
          limit={err === "quota_plan" ? planLimit : swapLimit}
          t={t}
        />
      ) : null}

      {kcalAdjust && !hide ? <KcalAdjustBanner delta={kcalAdjust.delta} reason={kcalAdjust.reason} t={t} /> : null}

      {plan?.generator === "mock" ? <FallbackPlanBanner t={t} /> : null}

      <DailyCheckInCard checkin={checkin} hideNumbers={hide} />

      {/* Today's intake and the weigh-in share one card, so the plan starts sooner. */}
      <div className={hide ? "surface-2" : "surface-2 grid md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] divide-y md:divide-y-0 md:divide-x divide-line"}>
        <DailyIntakeCard intake={intake} hideNumbers={hide} />
        {hide ? null : (
          <LogWeightCard
            latestKg={latestWeight?.kg ?? null}
            latestLoggedAt={latestWeight?.loggedAt ?? null}
            deltaKg={weightTrend.deltaKg}
          />
        )}
      </div>

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
          fmt={fmt}
          hideNumbers={hide}
        />
      )}

      {/* Skip days sit after the plan: a planning setting for the next
          generation, not a second week overview next to the plan's own. */}
      <SkipDaysCard weekStart={weekStart} skipDayIndices={skipDayIndices} />
      </Container>
    </>
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
    <div className="surface-2 rounded-xl border hairline-strong px-5 py-3 text-copy">
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

function FallbackPlanBanner({ t }: { t: T }) {
  return (
    // One quiet line, not a card: the plan below is still the point.
    <p className="max-w-3xl text-meta text-fg-dim">
      <span className="text-warn">{t("page.fallbackEyebrow")}.</span>{" "}
      {t("page.fallbackBody")}
    </p>
  );
}

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
    <div className="surface-2 rounded-xl border border-warn/40 px-5 py-3 text-copy">
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
    <section className="surface-2 rounded-2xl p-6 lg:p-10 max-w-2xl">
      <SectionHeader
        eyebrow={t("page.emptyEyebrow", { week: weekStartLabel(weekStart) })}
        title={t("page.emptyTitle")}
      />
      <p className="text-fg-dim text-copy max-w-md mb-5">
        {t("page.emptyBody")}
      </p>
      <div className="flex flex-wrap items-center gap-2">
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
      <p className="mt-4 text-meta text-fg-dim">
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
  fmt,
  hideNumbers,
}: {
  plan: Plan;
  todayIndex: number;
  fishPerWeek: number;
  diet: "omnivore" | "pescatarian" | "vegetarian" | "vegan";
  planLimit: RateLimitStatus;
  swapLimit: RateLimitStatus;
  t: T;
  fmt: (n: number) => string;
  hideNumbers: boolean;
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
      <section className={`grid ${hideNumbers ? "grid-cols-3" : "grid-cols-2 md:grid-cols-4"} gap-px bg-line border hairline rounded-lg overflow-hidden`}>
        {hideNumbers ? null : (
          <Stat label={t("page.statKcal")} value={plan.dailyKcal != null ? fmt(plan.dailyKcal) : "-"} />
        )}
        <Stat label={t("page.statProtein")} value={plan.dailyProteinG != null ? fmt(plan.dailyProteinG) : "-"} />
        <Stat label={t("page.statCarbs")} value={plan.dailyCarbsG != null ? fmt(plan.dailyCarbsG) : "-"} />
        <Stat label={t("page.statFat")} value={plan.dailyFatG != null ? fmt(plan.dailyFatG) : "-"} />
      </section>

      {/* Week strip */}
      {/* Four columns on a phone: every day cell is whole, nothing cut mid-word. */}
      <section aria-label={t("page.weekOverviewLabel")}>
        <ol className="grid grid-cols-4 gap-2 md:grid-cols-7">
          {DAY_KEYS.map((dayKey, i) => {
            const isToday = i === todayIndex;
            const meals = byDay[i] ?? [];
            const dayKcal = meals.reduce((sum, m) => sum + (m.estKcal ?? 0), 0);
            return (
              <li key={dayKey} className="min-w-0">
                <a
                  href={`#day-${i}`}
                  className="block surface-2 rounded-xl p-3 md:p-4 text-center lift transition-colors"
                  style={{
                    background: isToday ? "var(--bg-3)" : undefined,
                    borderColor: isToday ? "var(--line-bright)" : undefined,
                  }}
                >
                  <div className="eyebrow mb-1.5">{t(`dayLabels.${dayKey}`)}</div>
                  <div className="numeric text-section mb-1">{meals.length}</div>
                  <div className="text-micro text-fg-dim">
                    {t("page.meals")}
                  </div>
                  {hideNumbers ? null : (
                    <div className="numeric text-micro text-fg-dim mt-1.5">
                      {dayKcal > 0 ? `${fmt(dayKcal)} kcal` : "-"}
                    </div>
                  )}
                </a>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Today */}
      <section id={`day-${todayIndex}`}>
        <div className="flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow={t("page.todayEyebrow", { day: t(`dayLabels.${DAY_KEYS[todayIndex]}`) })}
            title={
              today.length === 1
                ? t("page.todayMealsOne", { count: today.length })
                : t("page.todayMealsOther", { count: today.length })
            }
            className="mb-0"
          />
          <span className="text-micro text-fg-dim shrink-0">
            {hideNumbers
              ? t("page.todayProtein", { protein: fmt(today.reduce((s, m) => s + (m.estProteinG ?? 0), 0)) })
              : t("page.todayMacros", {
                  kcal: fmt(today.reduce((s, m) => s + (m.estKcal ?? 0), 0)),
                  protein: fmt(today.reduce((s, m) => s + (m.estProteinG ?? 0), 0)),
                })}
          </span>
        </div>
        <ul className="space-y-3">
          {today.map((m) => (
            <li key={m.id}>
              <MealCard meal={m} loggable swapQuotaRemaining={swapRemaining} hideNumbers={hideNumbers} />
            </li>
          ))}
        </ul>
      </section>

      {/* Rest of week — collapsed by day */}
      <section className="space-y-3">
        <h2 className="font-display text-section">{t("page.restOfWeek")}</h2>
        <div className="surface-2 divide-y hairline">
        {byDay.map((meals, i) => {
          if (i === todayIndex) return null;
          const dayKcal = meals.reduce((sum, m) => sum + (m.estKcal ?? 0), 0);
          return (
            <details
              key={i}
              id={`day-${i}`}
              className="group"
              open={i === todayIndex + 1}
            >
              <summary className="cursor-pointer block px-5 py-4 list-none">
                <div className="flex items-center gap-4">
                  <div className="eyebrow flex-1">{t(`dayLabels.${DAY_KEYS[i]}`)}</div>
                  {hideNumbers ? null : (
                    <div className="numeric text-micro text-fg-dim shrink-0">
                      {fmt(dayKcal)} kcal
                    </div>
                  )}
                  <span aria-hidden className="text-fg-faint group-open:rotate-90 transition-transform">→</span>
                </div>
                <div className="mt-1 text-copy text-pretty">
                  {meals.map((m) => m.title).join(" · ")}
                </div>
              </summary>
              <ul className="border-t hairline divide-y hairline">
                {meals.map((m) => (
                  <li key={m.id} className="px-5 py-4">
                    <MealCard
                      meal={m}
                      loggable={false}
                      compact
                      swapQuotaRemaining={swapRemaining}
                      hideNumbers={hideNumbers}
                    />
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
        </div>
      </section>

      {/* Supplements */}
      {supplements.length > 0 ? (
        <section className="surface-2 rounded-2xl p-5 lg:p-6">
          <div className="eyebrow mb-3">{t("page.supplementsEyebrow")}</div>
          <p className="text-fg-dim text-meta mb-4 max-w-prose">
            {t("page.supplementsBody")}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {supplements.map((s) => (
              <li key={s.id} className="border hairline rounded-lg p-4">
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="text-copy">{s.title}</div>
                  <span className="text-micro text-fg-dim">
                    {s.necessity === "high-value"
                      ? t("page.supplementStrong")
                      : s.necessity === "useful"
                      ? t("page.supplementUseful")
                      : t("page.supplementConsider")}
                  </span>
                </div>
                <div className="text-meta text-fg-dim">{s.why}</div>
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
        <span className="text-meta text-fg-dim ml-auto">
          {plan.generator === "claude"
            ? t("page.generatedByClaude")
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
      <div className="numeric text-section lg:text-title">{value}</div>
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
