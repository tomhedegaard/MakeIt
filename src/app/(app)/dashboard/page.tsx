import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocaleTag } from "@/i18n/config";
import Container from "@/components/Container";
import InstallHint from "@/components/pwa/InstallHint";
import { getSession } from "@/lib/auth";
import { TODAY_SESSION, totalSets } from "@/lib/workout";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
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
import { hasMindCheckToday } from "@/lib/data/mind";
import { getDailyIntake } from "@/lib/data/nutrition-intake";
import { getOrCreateNutritionProfile } from "@/lib/data/nutrition";
import { resolveDailyTargets } from "@/lib/nutrition/plan-macros";
import { getTodayAdaptation } from "@/lib/data/today-adaptation";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import PageTitle from "@/components/ui/PageTitle";
import SectionHeader from "@/components/ui/SectionHeader";
import Stat from "@/components/ui/Stat";
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
import { buildHrvBandView, isOutOfBand, qualitativeFromBucket } from "@/lib/hrv/band";
import { demoSteadySeries } from "@/lib/hrv/demo-series";
import { loadDotsCopy, loadStripCopy } from "@/lib/ui/sprint-a-copy";
import {
  feedForSurface,
  statsForSurface,
  todayCardForSurface,
  upcomingForSurface,
} from "@/lib/trust/connected-first-run";
import { generatedSessionTitleKey } from "@/lib/i18n/member-bodycopy";

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
  rmssdMs: number;
  bucket: ReadinessBucket | null;
};

/**
 * Latest HRV reading for the morning signal. Demo mode uses the
 * steady fixture so Heart is visible without a wearable.
 */
async function getHrvChipData(memberId: string): Promise<HrvChipData | null> {
  if (!SUPABASE_ENABLED) {
    const view = buildHrvBandView(demoSteadySeries());
    return {
      rmssdMs: view.latestMs ?? 0,
      bucket: view.qualitative === "lav" ? "low" : view.qualitative === "ro" ? "high" : "normal",
    };
  }
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("hrv_readings")
    .select("rmssd_ms, readiness_bucket")
    .eq("member_id", memberId)
    .order("measured_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    rmssdMs: data.rmssd_ms as number,
    bucket: (data.readiness_bucket as ReadinessBucket | null) ?? null,
  };
}

export default async function TodayPage() {
  const member = (await getSession())!;
  const locale = await getLocale();
  const t = await getTranslations("Dashboard");
  const [stripCopy, dotsCopy] = await Promise.all([
    loadStripCopy(),
    loadDotsCopy(),
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
    mindChecked,
    prose,
    intakeRaw,
    demoProfile,
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
    hasMindCheckToday(member.id),
    getTodayProse(member.id),
    getDailyIntake(member.id),
    // Demo has no intake rows and no plan, so the food cell would show
    // "0 kcal" without a goal. The demo profile's target, resolved the
    // same way the demo meal plan resolves it, fills that in.
    connected ? null : getOrCreateNutritionProfile(member.id),
  ]);

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
  const stats = statsForSurface({ connected, fromDb: statsDb });

  const reviewedCount = myChecks.filter(
    (c) => c.reviewedAt && c.coachNotes
  ).length;

  const targetKcal =
    intakeRaw.targetKcal == null && demoProfile
      ? resolveDailyTargets(demoProfile).kcal
      : intakeRaw.targetKcal;

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
        sessionHref: today ? `/session/${today.id}` : "/coaching",
        hasHrv: hrv != null,
        qualitative: qualitativeFromBucket(hrv?.bucket ?? null),
        outOfBand: isOutOfBand(hrv?.bucket ?? null),
        mindCheckedToday: mindChecked,
        hasSession: today != null,
      })
    : demoInsightStream(`/session/${today?.id ?? TODAY_SESSION.id}`);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <FirstTimeTour />

      {/* 1. greeting */}
      <PageTitle
        className="pt-2"
        kicker={t("greeting.eyebrow")}
        title={`@${member.handle}`}
        action={
          <div className="text-right">
            <div className="eyebrow mb-1">{t("greeting.streakLabel")}</div>
            <div className="numeric text-3xl">{stats?.streakDays ?? (connected ? 0 : 12)}</div>
            <div className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">{t("greeting.streakUnit")}</div>
          </div>
        }
      />

      {/* 2. todaySession */}
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
              <span className="pulse-dot" />
              <span className="eyebrow eyebrow-domain">{t("todaySession.eyebrow", { programCode: today.programCode, week: today.week })}</span>
              {today.isDeload ? (
                <span className="ml-auto numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                  {t("todaySession.deload")}
                </span>
              ) : null}
            </div>
            <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-2">
              {today.dayLabel}
            </h2>
            <p className="text-fg-dim text-sm md:text-base leading-relaxed">{today.title}</p>
          </div>

          <AdaptiveReasonStrip model={engineStrip} copy={stripCopy} />

          <div className="grid grid-cols-3 gap-px bg-line border-b hairline">
            <div className="bg-bg-2 px-4 py-3">
              <div className="eyebrow mb-1">{t("todaySession.exercises")}</div>
              <div className="numeric text-2xl">{today.exerciseCount}</div>
            </div>
            <div className="bg-bg-2 px-4 py-3">
              <div className="eyebrow mb-1">{t("todaySession.sets")}</div>
              <div className="numeric text-2xl">{today.setCount}</div>
            </div>
            <div className="bg-bg-2 px-4 py-3">
              <div className="eyebrow mb-1">{t("todaySession.estTime")}</div>
              <div className="numeric text-2xl">
                {today.estimatedMinutes}
                <span className="text-fg-dim text-sm">{t("todaySession.minuteUnit")}</span>
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
                  <span className="numeric text-fg-faint text-xs w-6">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-fg/90 text-sm md:text-base truncate">{ex.name}</span>
                  <span className="numeric text-fg-faint text-xs">{ex.setCount}{t("todaySession.setCountSuffix")}</span>
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

      {/* 3. morningSignal */}
      <MorningSignal
        input={{
          session: today ? { adapted: adaptation != null && adaptation.acceptedByMember !== false } : null,
          hrv,
          mindCheckedToday: mindChecked,
          intake: { consumedKcal: intakeRaw.consumedKcal, targetKcal },
        }}
      />

      {/* 4. munkNote */}
      {reviewedCount > 0 ? (
        <Card domain="body" className="p-0 overflow-hidden">
          <Link href="/profile#form-checks" className="block px-5 py-4 lift">
            <div className="flex items-center gap-3">
              <span className="pulse-dot" />
              <div className="flex-1 min-w-0">
                <div className="text-sm">
                  {t("formChecks.answeredBefore")}{" "}
                  <span className="text-fg">
                    {t("formChecks.answeredCount", { count: reviewedCount })}
                  </span>
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-0.5">
                  {t("formChecks.readNotes")}
                </div>
              </div>
              <span className="text-fg-dim shrink-0" aria-hidden>
                →
              </span>
            </div>
          </Link>
        </Card>
      ) : null}

      {/* 5. prose, with the cross-domain insight cards under it */}
      <TodayProse model={prose} />
      <ConnectDotsStream cards={insightCards} copy={dotsCopy} />

      {/* 6. upcoming */}
      <section data-dashboard="upcoming">
        <SectionHeader
          title={t("upcoming.title")}
          href="/coaching"
          linkLabel={t("upcoming.seeWeek")}
        />
        {upcoming && upcoming.length > 0 ? (
          <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
            {upcoming.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/session/${row.id}`}
                  className="px-4 py-3 flex items-center gap-4 lift"
                >
                  <span className="eyebrow w-16 shrink-0">{fmtUpcomingDate(row.scheduledFor, t, locale)}</span>
                  <span className="flex-1 text-sm text-fg/90 truncate">{row.title}</span>
                  <span className="numeric text-fg-faint text-xs shrink-0">{t("todaySession.minutes", { count: row.estimatedMinutes })}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : upcoming === null ? (
          <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
            {mockUpcoming(t).map((row) => (
              <li key={row.d} className="px-4 py-3 flex items-center gap-4">
                <span className="eyebrow w-16 shrink-0">{row.d}</span>
                <span className="flex-1 text-sm text-fg/90 truncate">{row.t}</span>
                <span className="numeric text-fg-faint text-xs shrink-0">{row.m}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="surface-2 rounded-lg p-6 text-center text-sm text-fg-dim">
            {t("upcoming.empty")}
          </div>
        )}
      </section>

      {/* 7. stats */}
      <Card as="section" data-dashboard="stats" className="grid grid-cols-3 gap-4">
        <div>
          <Stat
            label={t("stats.volume")}
            value={stats ? formatVolume(stats.volumeKg) : connected ? "0" : "84.2K"}
          />
          <div className="text-[10px] font-mono text-fg-faint mt-1 flex items-center gap-1">
            <span>{t("stats.volumeMeta")}</span>
            {stats ? (
              <TrendArrow current={stats.volumeKg} previous={stats.volumeKgPrev} t={t} />
            ) : null}
          </div>
        </div>
        <div>
          <Stat
            label={t("stats.prs")}
            value={stats ? String(stats.prs4w).padStart(2, "0") : connected ? "00" : "03"}
          />
          <div className="text-[10px] font-mono text-fg-faint mt-1 flex items-center gap-1">
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
          <div className="text-[10px] font-mono text-fg-faint mt-1">{member.tier}</div>
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
          <div className="surface-2 rounded-lg p-6 text-center text-sm text-fg-dim">
            {t("crew.empty")}
            <div className="mt-3">
              <Link href="/community" className="btn btn-sm btn-primary">{t("crew.share")}</Link>
            </div>
          </div>
        )}
      </section>

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
    <li className="surface-2 rounded-lg p-4 flex items-center gap-3">
      <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
        {who.slice(1, 3).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm truncate">
          <span className="text-fg">{who}</span>{" "}
          <span className="text-fg-dim">{what}</span>
        </div>
        <div className="text-[10px] font-mono text-fg-faint mt-0.5">{when}</div>
      </div>
      {pr ? (
        <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 shrink-0">
          {prLabel}
        </span>
      ) : null}
    </li>
  );
}

function formatVolume(kg: number): string {
  if (kg <= 0) return "0";
  if (kg < 1000) return `${Math.round(kg)}`;
  return `${(kg / 1000).toFixed(1).replace(".", ",")}K`;
}

function formatReps(n: number, locale = "da"): string {
  return new Intl.NumberFormat(intlLocaleTag(locale)).format(n);
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
