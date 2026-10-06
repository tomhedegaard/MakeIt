import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocaleTag } from "@/i18n/config";
import Container from "@/components/Container";
import InstallHint from "@/components/pwa/InstallHint";
import { getSession } from "@/lib/auth";
import { TODAY_SESSION, totalSets } from "@/lib/workout";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import type { ReadinessBucket } from "@/lib/hrv/types";
import {
  getTodayCard,
  getUpcomingSessions,
  getRecentFeed,
  getMemberStats,
  type TodayCard,
  type CrewItem,
} from "@/lib/data/dashboard";
import { getMyFormChecks } from "@/lib/data/me";
import { getLatestUnseenPromotion } from "@/lib/data/tier-events";
import TierBanner from "@/components/app/TierBanner";
import FirstTimeTour from "@/components/app/FirstTimeTour";
import { getTodayMindCheck } from "@/lib/data/mind";
import { getDailyIntake } from "@/lib/data/nutrition-intake";
import { getOrCreateNutritionProfile } from "@/lib/data/nutrition";
import { resolveDailyTargets } from "@/lib/nutrition/plan-macros";
import { getTodayAdaptation } from "@/lib/data/today-adaptation";
import { getHrvReadingSeries } from "@/lib/data/hrv";
import { getMemberBody } from "@/lib/data/body";
import { getRecentWeights } from "@/lib/data/weight";
import { copenhagenIsoDate } from "@/lib/data/nutrition-checkin";
import { sevenDayAverages } from "@/lib/health/body-rules";
import { isMealEstimateEnabled } from "@/app/(app)/nutrition/actions";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageTitle from "@/components/ui/PageTitle";
import SectionHeader from "@/components/ui/SectionHeader";
import NarrativeBand from "@/components/ui/NarrativeBand";
import Stat from "@/components/ui/Stat";
import Avatar from "@/components/ui/Avatar";
import KeepOriginal from "@/components/dashboard/KeepOriginal";
import MorningSignal from "@/components/dashboard/MorningSignal";
import AdaptiveReasonStrip from "@/components/adaptive/AdaptiveReasonStrip";
import ConnectDotsStream from "@/components/dashboard/ConnectDotsStream";
import TodayProse from "@/components/dashboard/TodayProse";
import {
  demoEngineStrip,
  stripFromAvailableSignals,
} from "@/lib/adaptive/engine-strip";
import {
  buildTodayInsightStream,
  demoInsightStream,
} from "@/lib/dashboard/insight-stream";
import { getTodayProse } from "@/lib/data/today-prose";
import { buildHrvBandView, isOutOfBand, qualitativeFromBucket, rmssdMsFromLn } from "@/lib/hrv/band";
import { demoSteadySeries } from "@/lib/hrv/demo-series";
import { loadDotsCopy, loadStripCopy } from "@/lib/ui/sprint-a-copy";
import {
  feedForSurface,
  statsForSurface,
  todayCardForSurface,
  upcomingForSurface,
} from "@/lib/trust/connected-first-run";
import { generatedSessionTitleKey } from "@/lib/i18n/member-bodycopy";
import YouthToday from "@/components/youth/YouthToday";
import { youthClaimsFor } from "@/lib/youth/account";
import {
  emptyWeekStrip,
  getWeekStrip,
  mockWeekStrip,
  type WeekDay,
} from "@/lib/data/coaching";
import { weekStripForSurface } from "@/lib/trust/connected-first-run";
import { Check } from "lucide-react";
import { ICON } from "@/components/ui/icon";

type Translator = Awaited<ReturnType<typeof getTranslations<"Dashboard">>>;

function localizeGeneratedTitle(title: string, t: Translator): string {
  const key = generatedSessionTitleKey(title);
  return key ? t(`todaySession.${key}`) : title;
}

function mockUpcoming(t: Translator) {
  return [
    { d: t("upcoming.mock.tomorrowLabel"), t: t("upcoming.mock.tomorrowTitle"), m: t("todaySession.minutes", { count: 55 }) },
    { d: t("upcoming.mock.thuLabel"),      t: t("upcoming.mock.thuTitle"),      m: t("todaySession.minutes", { count: 70 }) },
    { d: t("upcoming.mock.friLabel"),      t: t("upcoming.mock.friTitle"),      m: t("todaySession.minutes", { count: 45 }) },
  ];
}

function mockFeed(t: Translator) {
  return [
    { who: "@nina_dl",    what: t("crew.mock.ninaWhat"),   when: t("crew.mock.ninaWhen"),   pr: true,  tier: "Beast" },
    { who: "@kasper_s",   what: t("crew.mock.kasperWhat"), when: t("crew.mock.kasperWhen"), pr: false, tier: "Athlete" },
    { who: "@maria.lift", what: t("crew.mock.mariaWhat"),  when: t("crew.mock.mariaWhen"),  pr: false, tier: "Beast" },
  ];
}

function todayCardFromMock(t: Translator): TodayCard {
  return {
    id: TODAY_SESSION.id,
    programCode: TODAY_SESSION.programCode,
    programName: TODAY_SESSION.programName,
    week: TODAY_SESSION.week,
    isDeload: false,
    dayLabel: t("todaySession.mock.dayLabel"),
    title: t("todaySession.mock.title"),
    estimatedMinutes: TODAY_SESSION.estimatedMinutes,
    exerciseCount: TODAY_SESSION.exercises.length,
    setCount: totalSets(TODAY_SESSION),
    exercises: TODAY_SESSION.exercises.map((ex) => ({
      name: ex.name,
      setCount: ex.sets.length,
      slug: ex.library?.slug ?? null,
    })),
  };
}

function fmtUpcomingDate(iso: string | null, t: Translator, locale: string): string {
  if (!iso) return t("upcoming.soon");
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.getTime() === today.getTime()) return t("upcoming.today");
  if (d.getTime() === tomorrow.getTime()) return t("upcoming.tomorrow");
  return d.toLocaleDateString(intlLocaleTag(locale), { weekday: "short" }).replace(".", "");
}

type HrvChipData = {
  latestMs: number;
  bucket: ReadinessBucket | null;
  band: { lowMs: number; highMs: number } | null;
  nightsMs: number[];
};

/**
 * The Heart card: latest night, the personal band once it is steady, and
 * recent nights for the sparkline (same band view as /hrv). Demo mode
 * uses the steady fixture so Heart is visible without a wearable.
 */
async function getHrvChipData(memberId: string): Promise<HrvChipData | null> {
  const series = SUPABASE_ENABLED
    ? await getHrvReadingSeries(memberId, { rangeDays: 60 })
    : demoSteadySeries();
  const view = buildHrvBandView(series);
  if (view.latestMs === null) return null;
  return {
    latestMs: view.latestMs,
    bucket: series[series.length - 1].readinessBucket,
    band:
      view.state === "steady" && view.bandLowMs !== null && view.bandHighMs !== null
        ? { lowMs: view.bandLowMs, highMs: view.bandHighMs }
        : null,
    nightsMs: series.map((r) => rmssdMsFromLn(r.lnRmssd)),
  };
}

export default async function TodayPage() {
  const member = (await getSession())!;

  // MakeIt Ung: its own I dag, without kcal, body weight or HRV numbers.
  const youth = SUPABASE_ENABLED ? await youthClaimsFor(member.id) : null;
  if (youth) {
    return <YouthToday memberId={member.id} name={member.displayName ?? member.handle} mind={youth.mind} />;
  }

  const locale = await getLocale();
  const t = await getTranslations("Dashboard");
  const [stripCopy, dotsCopy, tWeek] = await Promise.all([
    loadStripCopy(),
    loadDotsCopy(),
    getTranslations("Coaching.week"),
  ]);
  const connected = SUPABASE_ENABLED;
  // Everything independent loads in one batch. Demo mode skips the
  // dashboard queries exactly as before (null → surface fallbacks).
  const [
    todayDb,
    upcomingDb,
    feedDb,
    statsDb,
    myChecks,
    promotion,
    hrv,
    mindToday,
    prose,
    intakeRaw,
    demoProfile,
    weekDb,
    estimateEnabled,
    body,
  ] = await Promise.all([
    connected ? getTodayCard(member.id) : null,
    connected ? getUpcomingSessions(member.id, 3) : null,
    connected ? getRecentFeed(3) : null,
    connected ? getMemberStats(member.id) : null,
    // Coach-review notification: count reviewed form-checks with notes.
    // (No "read" state in v1.)
    getMyFormChecks(member.id, 5),
    // Tier promotion banner: latest unseen tier-up.
    getLatestUnseenPromotion(member.id),
    // Morning signal inputs (C5).
    getHrvChipData(member.id),
    getTodayMindCheck(member.id),
    getTodayProse(member.id),
    getDailyIntake(member.id),
    // Demo has no intake rows and no plan, so the food cell would show
    // "0 kcal" without a goal. The demo profile's target, resolved the
    // same way the demo meal plan resolves it, fills that in.
    connected ? null : getOrCreateNutritionProfile(member.id),
    // Same Mon–Sun strip as Træn, same Today pick.
    connected ? getWeekStrip(member.id) : null,
    isMealEstimateEnabled(member),
    getMemberBody(member.id),
  ]);
  const mindChecked = mindToday != null;
  // The weight card is opt-in and gone when numbers are hidden (spec §S).
  const weightCard =
    body.showWeightCard && !body.hideNumbers
      ? {
          averages: sevenDayAverages(
            (await getRecentWeights(member.id, 21)).map((w) => ({ kg: Number(w.kg), date: w.loggedAt.slice(0, 10) })),
            copenhagenIsoDate(),
          ),
          pejlemaerkeKg: body.pejlemaerkeKg,
        }
      : null;

  const todayRaw = todayCardForSurface({
    connected,
    fromDb: todayDb,
    demo: todayCardFromMock(t),
  });
  const today = todayRaw
    ? {
        ...todayRaw,
        title: localizeGeneratedTitle(todayRaw.title, t),
      }
    : todayRaw;
  const upcomingRaw = upcomingForSurface({ connected, fromDb: upcomingDb });
  const upcoming = upcomingRaw
    ? upcomingRaw.map((row) => ({
        ...row,
        title: localizeGeneratedTitle(row.title, t),
      }))
    : upcomingRaw;
  const feed = feedForSurface({ connected, fromDb: feedDb });
  const week = weekStripForSurface({
    connected,
    fromDb: weekDb,
    demo: mockWeekStrip(),
    empty: emptyWeekStrip(),
  });
  const stats = statsForSurface({ connected, fromDb: statsDb });

  const reviewedCount = myChecks.filter(
    (c) => c.reviewedAt && c.coachNotes
  ).length;

  const demoTargets = intakeRaw.targetKcal == null && demoProfile ? resolveDailyTargets(demoProfile) : null;
  const targetKcal = demoTargets ? demoTargets.kcal : intakeRaw.targetKcal;
  const targetProtein = demoTargets ? demoTargets.proteinG : intakeRaw.targetProtein;

  // Today's adaptation (C1) needs today's session id.
  const adaptation = await getTodayAdaptation(member.id, today?.id ?? null);

  const engineStrip = connected
    ? stripFromAvailableSignals({
        hasHrv: hrv != null,
        readinessBucket: hrv?.bucket ?? null,
        hasSession: today != null,
      })
    : demoEngineStrip();

  const insightCards = connected
    ? buildTodayInsightStream({
        hasHrv: hrv != null,
        qualitative: qualitativeFromBucket(hrv?.bucket ?? null),
        outOfBand: isOutOfBand(hrv?.bucket ?? null),
        mindCheckedToday: mindChecked,
        hasSession: today != null,
      })
    : demoInsightStream();

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <FirstTimeTour />

      {/* 1. header (spec §6.1): "Din uge." with the brief's kicker and line;
          the kicker carries Krop's colour via data-domain. */}
      <div data-domain="body">
      <PageTitle
        className="pt-2"
        kicker={t("greeting.eyebrow")}
        title={t("greeting.title")}
        action={
          <div className="text-right">
            <div className="eyebrow mb-1">{t("greeting.streakLabel")}</div>
            <div className="numeric text-title">{stats?.streakDays ?? (connected ? 0 : 12)}</div>
            <div className="text-micro text-fg-faint">{t("greeting.streakUnit")}</div>
          </div>
        }
      />

      </div>
      <p className="-mt-2 max-w-prose text-copy text-fg-body">{t("greeting.subtitle")}</p>

      <WeekStrip
        week={week}
        copy={{
          ariaLabel: tWeek("ariaLabel"),
          rest: tWeek("rest"),
          today: tWeek("today"),
          done: tWeek("done"),
          days: Object.fromEntries(
            week.map((d) => [d.dayKey, tWeek(`days.${d.dayKey}`)]),
          ),
        }}
      />

      {/*
        From lg: main column (session, prose, insights) beside a side rail
        (morning signal, numbers, upcoming, crew). DOM order is the phone
        order. The rail spans the flexible middle row, so it starts right
        under the morning signal instead of waiting for the session card.
      */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem] lg:grid-rows-[auto_1fr_auto_auto] lg:gap-x-10 items-start">
      {/* 2. todaySession */}
      <div className="lg:col-start-1 lg:row-start-1 lg:row-span-2">
      {today ? (
        <Card
          variant="primary"
          domain="body"
          as="section"
          data-dashboard="todaySession"
          aria-label={t("todaySession.ariaLabel")}
          className="p-0 overflow-hidden"
        >
          <div className="px-5 pt-5 pb-4 border-b hairline">
            <span className="domain-stroke mb-3" aria-hidden />
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="eyebrow eyebrow-domain">{t("todaySession.eyebrow", { programCode: today.programCode, week: today.week })}</span>
              {today.isDeload ? (
                <span className="ml-auto numeric text-micro border hairline-strong px-2 py-0.5">
                  {t("todaySession.deload")}
                </span>
              ) : null}
            </div>
            <h2 className="font-display text-section mb-2">
              {today.dayLabel}
            </h2>
            <p className="text-fg-dim text-meta md:text-copy">{today.title}</p>
          </div>

          <AdaptiveReasonStrip model={engineStrip} copy={stripCopy} />

          <div className="grid grid-cols-3 gap-px bg-line border-b hairline">
            <div className="bg-bg-2 px-4 py-3">
              <div className="eyebrow mb-1">{t("todaySession.exercises")}</div>
              <div className="numeric text-section">{today.exerciseCount}</div>
            </div>
            <div className="bg-bg-2 px-4 py-3">
              <div className="eyebrow mb-1">{t("todaySession.sets")}</div>
              <div className="numeric text-section">{today.setCount}</div>
            </div>
            <div className="bg-bg-2 px-4 py-3">
              <div className="eyebrow mb-1">{t("todaySession.estTime")}</div>
              <div className="numeric text-section">
                {today.estimatedMinutes}{" "}
                <span className="text-fg-dim text-meta">{t("todaySession.minuteUnit")}</span>
              </div>
            </div>
          </div>

          {/* Start sits above the exercise list so it stays above the fold on phones (spec §6). */}
          <div className="p-4 lg:p-5 flex flex-col items-stretch gap-3 border-b hairline">
            <Link href={`/session/${today.id}`} className="btn btn-primary btn-xl">
              {t("todaySession.start")}
            </Link>
            {adaptation ? (
              <KeepOriginal
                modifierId={adaptation.modifierId}
                sessionId={today.id}
                accepted={adaptation.acceptedByMember}
              />
            ) : null}
          </div>

          <ul className="divide-y hairline">
            {today.exercises.map((ex, i) => {
              const row = (
                <>
                  <span className="numeric text-fg-faint text-micro w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 min-w-0 text-fg-body text-copy">{ex.name}</span>
                  <span className="numeric text-fg-faint text-micro">{ex.setCount}{t("todaySession.setCountSuffix")}</span>
                </>
              );
              return (
                <li key={`${ex.name}-${i}`}>
                  {ex.slug ? (
                    <Link
                      href={`/train/exercises/${ex.slug}`}
                      className="px-5 py-3 flex items-center gap-4 lift"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="px-5 py-3 flex items-center gap-4">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState
          role="region"
          aria-label={t("todaySession.ariaLabel")}
          data-dashboard="todaySession"
          data-domain="body"
          data-today-empty=""
          title={t("todaySession.emptyTitle")}
          body={t("todaySession.emptyBody")}
          actionHref="/coaching"
          actionLabel={t("todaySession.emptyCta")}
        />
      )}
      </div>

      {/* 3. morningSignal */}
      <div className="lg:col-start-2 lg:row-start-1">
      <MorningSignal
        estimateEnabled={estimateEnabled}
        input={{
          hrv,
          mind: mindToday ? { energy: mindToday.energy, stress: mindToday.stress, focus: mindToday.focus } : null,
          intake: {
            consumedKcal: intakeRaw.consumedKcal,
            targetKcal,
            consumedProtein: intakeRaw.consumedProtein,
            targetProtein,
          },
          trainingDay: today != null,
          hideNumbers: body.hideNumbers,
          weight: weightCard,
        }}
      />
      </div>

      <div className="space-y-8 lg:col-start-1 lg:row-start-3">

      {/* 5. prose, with the cross-domain insight cards under it */}
      <TodayProse model={prose} />
      <ConnectDotsStream cards={insightCards} copy={dotsCopy} />

      </div>

      <div className="space-y-8 lg:col-start-2 lg:row-start-2 lg:row-span-2">

      {/* 6. upcoming */}
      <section data-dashboard="upcoming">
        <SectionHeader
          title={t("upcoming.title")}
          href="/coaching"
          linkLabel={t("upcoming.seeWeek")}
        />
        {upcoming && upcoming.length > 0 ? (
          <ul className="surface-2 divide-y hairline overflow-hidden">
            {upcoming.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/session/${row.id}`}
                  className="px-4 py-3 flex items-center gap-4 lift"
                >
                  <span className="eyebrow w-16 shrink-0">{fmtUpcomingDate(row.scheduledFor, t, locale)}</span>
                  <span className="flex-1 min-w-0 text-copy text-fg/90 text-pretty">{row.title}</span>
                  <span className="numeric text-fg-faint text-micro shrink-0">{t("todaySession.minutes", { count: row.estimatedMinutes })}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : upcoming === null ? (
          <ul className="surface-2 divide-y hairline overflow-hidden">
            {mockUpcoming(t).map((row) => (
              <li key={row.d} className="px-4 py-3 flex items-center gap-4">
                <span className="eyebrow w-16 shrink-0">{row.d}</span>
                <span className="flex-1 min-w-0 text-copy text-fg/90 text-pretty">{row.t}</span>
                <span className="numeric text-fg-faint text-micro shrink-0">{row.m}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="surface-2 p-6 text-meta text-fg-dim">
            {t("upcoming.empty")}
          </div>
        )}
      </section>

      {/* 7. stats */}
      <Card as="section" data-dashboard="stats" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-1 lg:gap-5">
        {/* Volumen fylder en hel række på telefon: "84.200 kg" i 2xl
            støder ellers ind i nabotallet ved 375 px. */}
        <div className="col-span-2 sm:col-span-1">
          <Stat
            label={t("stats.volume")}
            value={formatKg(stats ? stats.volumeKg : connected ? 0 : 84_200, locale)}
            unit="kg"
          />
          <div className="text-micro text-fg-faint mt-1 flex items-center gap-1">
            <span>{t("stats.volumeMeta")}</span>
            {stats ? (
              <TrendArrow current={stats.volumeKg} previous={stats.volumeKgPrev} t={t} />
            ) : null}
          </div>
        </div>
        <div>
          <Stat
            label={t("stats.prs")}
            value={stats ? String(stats.prs4w) : connected ? "0" : "3"}
          />
          <div className="text-micro text-fg-faint mt-1 flex items-center gap-1">
            <span>{t("stats.prsMeta")}</span>
            {stats ? (
              <TrendArrow current={stats.prs4w} previous={stats.prsPrev} t={t} />
            ) : null}
          </div>
        </div>
        <div>
          <Stat
            label={t("stats.reps")}
            value={stats ? formatReps(stats.repsBalance, locale) : connected ? "0" : "1.420"}
          />
          <div className="text-micro text-fg-faint mt-1">{member.tier}</div>
        </div>
      </Card>

      {/* 8. crew */}
      <section data-dashboard="crew">
        <SectionHeader
          title={t("crew.title")}
          href="/community"
          linkLabel={t("crew.seeFeed")}
        />
        {feed && feed.length > 0 ? (
          <ul className="space-y-2.5">
            {feed.map((row) => (
              <CrewRow key={row.id} {...row} prLabel={t("crew.prBadge")} />
            ))}
          </ul>
        ) : feed === null ? (
          <ul className="space-y-2.5">
            {mockFeed(t).map((row, i) => (
              <CrewRow key={i} id={String(i)} {...row} prLabel={t("crew.prBadge")} />
            ))}
          </ul>
        ) : (
          <div className="surface-2 p-6 text-meta text-fg-dim">
            {t("crew.empty")}
            <div className="mt-3">
              <Link href="/community" className="btn btn-sm">{t("crew.share")}</Link>
            </div>
          </div>
        )}
      </section>

      </div>

      {/* Last on a phone (spec §6.1 "nederst"), under the main column on lg. */}
      <div className="lg:col-start-1 lg:row-start-4">
        {/* Fortællebånd (spec §6.1): the human signature sits at the bottom
            of the day, after HQ's reading. */}
        {reviewedCount > 0 ? (
          <NarrativeBand
            kicker={t("formChecks.bandKicker")}
            title={`${t("formChecks.answeredBefore")} ${t("formChecks.answeredCount", { count: reviewedCount })}`}
            action={
              <Link href="/profile#form-checks" className="btn btn-sm">
                {t("formChecks.seeAnswer")}
              </Link>
            }
          />
        ) : null}
      </div>
      </div>

      {/* 9. tierBanner */}
      {promotion ? (
        <TierBanner
          eventId={promotion.id}
          fromTier={promotion.fromTier}
          toTier={promotion.toTier}
        />
      ) : null}

      {/* 10. installHint */}
      <InstallHint />
    </Container>
  );
}

function CrewRow({
  who, what, when, pr, prLabel,
}: Pick<CrewItem, "id" | "who" | "what" | "when" | "pr"> & { tier?: string; prLabel: string }) {
  return (
    <li className="surface-2 p-4 flex items-center gap-3">
      <Avatar handle={who} />
      <div className="flex-1 min-w-0">
        <div className="text-copy break-words">
          <span className="text-fg">{who}</span>{" "}
          <span className="text-fg-dim">{what}</span>
        </div>
        <div className="text-micro text-fg-faint mt-0.5">{when}</div>
      </div>
      {pr ? (
        <span className="numeric text-micro border hairline-strong px-2 py-0.5 shrink-0">
          {prLabel}
        </span>
      ) : null}
    </li>
  );
}

/** Whole kilos with the locale's grouping: 84.200 (da), 84,200 (en). */
function formatKg(kg: number, locale = "da"): string {
  return new Intl.NumberFormat(intlLocaleTag(locale), { maximumFractionDigits: 0 }).format(Math.max(0, kg));
}

function formatReps(n: number, locale = "da"): string {
  return new Intl.NumberFormat(intlLocaleTag(locale)).format(n);
}

/** "Deadlift" → "Dead\u00ADlift": a break point before common lift suffixes. */
function softHyphenateLift(label: string): string {
  return label.replace(/(?<=\p{L}{3})(lift|press|head|squat|row|pull|push)/giu, "\u00AD$1");
}

/**
 * Mon–Sun under the header (spec §6.1): "Man 21 Squat". Today carries the
 * 2 px mos stroke, the same marker the tab bar uses for the active tab.
 */
function WeekStrip({
  week,
  copy,
}: {
  week: WeekDay[];
  copy: {
    ariaLabel: string;
    rest: string;
    today: string;
    done: string;
    days: Record<string, string>;
  };
}) {
  return (
    <nav aria-label={copy.ariaLabel} data-dashboard="week">
      <ol className="grid grid-cols-7 border hairline divide-x hairline">
        {week.map((day) => {
          const body = (
            <>
              <span className="block text-micro text-fg-dim">{copy.days[day.dayKey]}</span>
              <span className="flex items-center gap-1 numeric text-copy text-fg">
                {day.date}
                {day.done ? (
                  <Check {...ICON} aria-label={copy.done} className="size-3.5 text-fg-dim" />
                ) : null}
              </span>
              {/* Lift names wrap to two lines at 375 instead of clipping:
                  a soft hyphen splits compounds ("Dead-lift") even where the
                  browser has no hyphenation dictionary. */}
              <span
                lang={day.rest ? undefined : "en"}
                className={`block hyphens-auto [overflow-wrap:anywhere] text-micro ${day.rest ? "text-fg-dim" : "text-fg"}`}
              >
                {day.sessionLabel ? softHyphenateLift(day.sessionLabel) : copy.rest}
              </span>
            </>
          );
          const cell = `block h-full px-1 pt-2 pb-2.5 sm:px-3 border-t-2 ${
            day.today ? "border-t-signal" : "border-t-transparent"
          }`;
          return (
            <li key={day.iso} aria-current={day.today ? "date" : undefined} className="min-w-0">
              {day.sessionId ? (
                <Link href={`/session/${day.sessionId}`} className={`${cell} lift`}>
                  {body}
                </Link>
              ) : (
                <div className={cell}>{body}</div>
              )}
              {day.today ? <span className="sr-only">{copy.today}</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Tiny trend chip: shows "↑ 12%" / "↓ 4%" relative to a previous-
 * period number. Hidden when prev is 0 (no signal) or when both
 * windows are empty. ±2% rounds to flat ("·") to suppress noise.
 */
function TrendArrow({
  current,
  previous,
  t,
}: {
  current: number;
  previous: number;
  t: Translator;
}) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return (
      <span className="text-fg-dim" aria-label={t("trend.newActivity")}>
        {t("trend.new")}
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (Math.abs(pct) < 3) {
    return (
      <span className="text-fg-faint" aria-label={t("trend.stable")}>
        ·
      </span>
    );
  }
  return (
    <span
      className={pct > 0 ? "text-fg" : "text-fg-dim"}
      aria-label={
        pct > 0
          ? t("trend.up", { pct })
          : t("trend.down", { pct: Math.abs(pct) })
      }
    >
      {pct > 0 ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}
