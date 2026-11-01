import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { intlLocaleTag } from "@/i18n/config";
import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";
import { pricing } from "@/lib/pricing";
import { TODAY_SESSION, totalSets } from "@/lib/workout";
import { getSession } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  getTodayCard,
  getMemberStats,
  type TodayCard,
} from "@/lib/data/dashboard";
import {
  emptyWeekStrip,
  getActiveProgram,
  getProgramLibrary,
  getSessionStreak,
  getWeekStrip,
  mockWeekStrip,
  type ActiveProgram,
  type ProgramListing,
  type WeekDay,
} from "@/lib/data/coaching";
import { hasDemoProgramDetail } from "@/lib/data/coach-programs";
import StartProgramButton from "./StartProgramButton";
import {
  computeTrendChip,
  generatedSessionTitleKey,
  seedProgramCopyPath,
} from "@/lib/i18n/member-bodycopy";
import {
  libraryForSurface,
  todayCardForSurface,
  weekStripForSurface,
} from "@/lib/trust/connected-first-run";

type CoachingT = Awaited<ReturnType<typeof getTranslations<"Coaching">>>;

export default async function TrainPage() {
  const member = await getSession();
  const memberId = member?.id ?? null;
  const t = await getTranslations("Coaching");
  const locale = await getLocale();
  const connected = Boolean(SUPABASE_ENABLED && memberId);

  const [todayCardDb, weekDb, activeDb, libraryDb, statsDb, streakDb] =
    connected && memberId
      ? await Promise.all([
          getTodayCard(memberId),
          getWeekStrip(memberId),
          getActiveProgram(memberId),
          getProgramLibrary(memberId),
          getMemberStats(memberId),
          getSessionStreak(memberId),
        ])
      : ([null, null, null, null, null, 0] as const);

  const todayRaw = todayCardForSurface({
    connected,
    fromDb: todayCardDb,
    demo: todayCardFromMock(t),
  });
  const today = todayRaw
    ? { ...todayRaw, title: localizeGeneratedTitle(todayRaw.title, t) }
    : todayRaw;
  const week: WeekDay[] = weekStripForSurface({
    connected,
    fromDb: weekDb,
    demo: mockWeekStrip(),
    empty: emptyWeekStrip(),
  });
  const library: ProgramListing[] = libraryForSurface({
    connected,
    fromDb: libraryDb,
    demo: mockLibrary(t),
  }).map((p) => localizeSeedProgram(p, t));
  const active: ActiveProgram | null = connected ? activeDb : demoActive(library);
  const sets = today
    ? today.setCount > 0
      ? today.setCount
      : totalSets(TODAY_SESSION)
    : 0;

  // Demo numbers are the ones I dag showed before the numbers moved here.
  const volumeKg = statsDb?.volumeKg ?? (connected ? 0 : 84_200);
  const volumeKgPrev = statsDb?.volumeKgPrev ?? (connected ? 0 : 78_400);
  const prs4w = statsDb?.prs4w ?? (connected ? 0 : 3);
  const prsPrev = statsDb?.prsPrev ?? (connected ? 0 : 2);
  // Prefer the dedicated streak getter; fall back to the stats one.
  const streakDays = connected ? streakDb || statsDb?.streakDays || 0 : 12;

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <div className="pt-2 pb-1">
        <PageTitle kicker={t("header.eyebrow")} title={t("header.title")} />
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span data-identity="coach" className="eyebrow">{t("header.coachChip")}</span>
          <span data-identity="motor" className="text-micro text-fg-faint">
            {t("header.motorChip")}
          </span>
        </div>
        <p className="mt-3 text-fg-dim text-copy max-w-md">
          {t("header.subtitle")}
        </p>
      </div>

      {/* Active program progress */}
      {active ? (
        <section className="surface-2 rounded-2xl p-5 lg:p-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="eyebrow mb-1">{t("active.eyebrow")}</div>
              <div className="font-display text-section">{active.name}</div>
            </div>
            <div className="text-right">
              <div className="numeric text-title">
                {String(active.currentWeek).padStart(2, "0")}{" "}
                <span className="text-fg-dim text-copy">/ {active.weeks}</span>
              </div>
              <div className="eyebrow">{t("active.weeks")}</div>
            </div>
          </div>
          <div className="h-1.5 bg-bg-3 overflow-hidden">
            <div
              className="h-full bg-fg"
              style={{
                width: `${Math.min(100, (active.currentWeek / active.weeks) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
            <MiniWithTrend
              label={t("active.volume")}
              value={formatVolume(volumeKg, locale)}
              suffix={volumeKg >= 1000 ? t("active.tonUnit") : t("active.kgUnit")}
              current={volumeKg}
              previous={volumeKgPrev}
              newLabel={t("trend.new")}
            />
            <MiniWithTrend
              label={t("active.prs")}
              value={String(prs4w).padStart(2, "0")}
              current={prs4w}
              previous={prsPrev}
              newLabel={t("trend.new")}
            />
            <Mini label={t("active.streak")} value={streakDays} suffix={t("active.dayUnit")} small />
          </div>
        </section>
      ) : null}

      {/* Next session: one line. The full session card lives on I dag. */}
      {today ? (
        <section
          aria-label={t("next.ariaLabel")}
          className="surface-2 rounded-2xl px-5 py-4 flex items-center gap-4"
        >
          <div className="min-w-0 flex-1">
            <div className="eyebrow mb-1">{t("next.eyebrow")}</div>
            <div className="text-copy truncate">
              {today.dayLabel}
              <span className="text-fg-dim"> · {t("next.meta", { sets, minutes: today.estimatedMinutes })}</span>
            </div>
          </div>
          <Link href={`/session/${today.id}`} className="btn btn-primary btn-sm shrink-0">
            {t("next.start")}
          </Link>
        </section>
      ) : null}

      {/* Week strip — horizontal scroll on mobile */}
      <section
        aria-label={t("week.ariaLabel")}
        className="-mx-5 md:mx-0 px-5 md:px-0 overflow-x-auto"
      >
        <ol className="flex gap-2 md:grid md:grid-cols-7 min-w-max md:min-w-0">
          {week.map((day) => {
            const inner = (
              <div
                className="surface-2 rounded-xl p-3 md:p-4 w-[78px] md:w-auto text-center lift"
                data-active={day.today}
                style={{
                  background: day.today ? "var(--bg-3)" : undefined,
                  borderColor: day.today ? "var(--line-bright)" : undefined,
                }}
              >
                <div className="eyebrow mb-1.5">{t(`week.days.${day.dayKey}`)}</div>
                <div className="numeric text-section mb-1">
                  {String(day.date).padStart(2, "0")}
                </div>
                <div
                  className={`text-micro ${
 day.rest ? "text-fg-faint" : "text-fg-dim"
 }`}
                >
                  {day.sessionLabel || t("week.rest")}
                </div>
                <div className="mt-2 flex justify-center">
                  {day.done ? (
                    <span
                      className="size-2 rounded-full bg-fg"
                      aria-label={t("week.done")}
                    />
                  ) : day.today ? (
                    <span className="pulse-dot" aria-label={t("week.today")} />
                  ) : day.rest ? (
                    <span
                      className="size-2 rounded-full bg-fg-faint"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="size-2 rounded-full border hairline-strong"
                      aria-hidden
                    />
                  )}
                </div>
              </div>
            );
            return (
              <li key={day.iso} className="shrink-0 md:shrink">
                {day.sessionId ? (
                  <Link href={`/session/${day.sessionId}`}>{inner}</Link>
                ) : (
                  inner
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Programs library */}
      <section id="programs">
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">{t("library.eyebrow")}</div>
          <span className="text-micro text-fg-faint">{library.length}</span>
        </div>

        <ul className="space-y-3">
          {library.map((p) => (
            <li key={p.code}>
              <article className="surface-2 rounded-2xl p-5 lg:p-6 lift">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="eyebrow mb-2">
                      {p.code} · {p.type}
                      {p.active && p.currentWeek ? (
                        <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 border hairline-strong">
                          <span className="size-1.5 rounded-full bg-fg" />{" "}
                          {t("library.activeBadge", { week: p.currentWeek })}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-display text-card truncate">
                      {p.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="numeric text-section">{p.weeks}</div>
                    <div className="eyebrow">{t("active.weeks")}</div>
                  </div>
                </div>

                {p.description ? (
                  <p className="text-fg-dim text-meta mb-4">
                    {p.description}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-px bg-line border hairline rounded-lg overflow-hidden mb-4">
                  <div className="bg-bg-2 px-3 py-2.5">
                    <div className="eyebrow mb-0.5">
                      {p.coachName ? t("library.coach") : t("library.engine")}
                    </div>
                    <div className="text-copy">
                      {p.coachName ?? t("library.engineName")}
                    </div>
                  </div>
                  <div className="bg-bg-2 px-3 py-2.5">
                    <div className="eyebrow mb-0.5">{t("library.level")}</div>
                    <div className="text-copy">
                      {p.level ?? t("library.levelFallback")}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.active ? (
                    today ? (
                    <Link
                      href={today ? `/session/${today.id}` : "/dashboard"}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      {t("library.continue")}
                    </Link>
                    ) : (
                    <Link
                      href={`/program/${p.code}`}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      {t("library.details")}
                    </Link>
                    )
                  ) : (
                    <StartProgramButton
                      programId={p.id}
                      programName={p.name}
                      hasOtherActive={Boolean(active)}
                      hasDays={p.dayCount > 0}
                    />
                  )}
                  {connected || hasDemoProgramDetail(p.code) ? (
                    <Link
                      href={`/program/${p.code}`}
                      className="btn btn-sm"
                    >
                      {t("library.details")}
                    </Link>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* 1:1 — only fully human */}
      <section className="surface-2 rounded-2xl p-6 lg:p-10">
        <div className="eyebrow mb-3">{t("oneOnOne.eyebrow")}</div>
        <h3 className="font-display text-card mb-3">
          {t("oneOnOne.title")}
        </h3>
        <p className="text-fg-dim text-copy max-w-xl mb-5">
          {t("oneOnOne.body", { count: pricing.oneOnOne.spots })}
        </p>

        <div className="flex items-baseline gap-2 mb-5">
          <span className="numeric text-title">{pricing.oneOnOne.amount}</span>
          <span className="numeric text-fg-dim text-meta">
            {t("oneOnOne.priceSuffix", {
              currency: pricing.oneOnOne.currency,
              period: pricing.oneOnOne.period,
            })}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/billing" className="btn btn-primary">
            {t("oneOnOne.apply")}
          </Link>
          <button type="button" className="btn">{t("oneOnOne.readMore")}</button>
        </div>
      </section>
    </Container>
  );
}

function Mini({
  label,
  value,
  suffix,
  small,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  small?: boolean;
}) {
  return (
    <div className="bg-bg-2 px-4 py-3 text-center">
      <div className="eyebrow mb-1">{label}</div>
      <div className={`numeric ${small ? "text-section" : "text-section"}`}>
        {value}
        {suffix ? <span className="text-fg-dim text-meta ml-0.5">{suffix}</span> : null}
      </div>
    </div>
  );
}

function MiniWithTrend({
  label,
  value,
  suffix,
  current,
  previous,
  newLabel,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  current: number;
  previous: number;
  newLabel: string;
}) {
  const trend = computeTrendChip(current, previous, newLabel);
  return (
    <div className="bg-bg-2 px-4 py-3 text-center">
      <div className="eyebrow mb-1">{label}</div>
      <div className="numeric text-section">
        {value}
        {suffix ? <span className="text-fg-dim text-meta ml-0.5">{suffix}</span> : null}
      </div>
      {trend ? (
        <div
          className={`mt-0.5 text-micro ${
 trend.direction === "up"
 ? "text-fg"
 : trend.direction === "down"
 ? "text-fg-dim"
 : "text-fg-faint"
 }`}
        >
          {trend.label}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Volume formatting: 84_200 → "84.2K", 950 → "950"
 * ---------------------------------------------------------------- */

/** 84.231 kg → "84,2" (tons, da) / "84.2" (en); under a ton → whole kg. */
function formatVolume(kg: number, locale: string): string {
  const tag = intlLocaleTag(locale);
  if (kg >= 1000) {
    return new Intl.NumberFormat(tag, { maximumFractionDigits: kg >= 100_000 ? 0 : 1 }).format(kg / 1000);
  }
  return new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }).format(kg);
}

/* ---------------------------------------------------------------- *
 * Mock fallbacks (mirror the previous static markup so demo mode and
 * unconnected sessions still render the page).
 * ---------------------------------------------------------------- */

function localizeGeneratedTitle(title: string, t: CoachingT): string {
  const key = generatedSessionTitleKey(title);
  return key ? t(`today.${key}`) : title;
}

function localizeSeedProgram(p: ProgramListing, t: CoachingT): ProgramListing {
  const path = seedProgramCopyPath(p.code);
  if (!path) return p;
  return {
    ...p,
    type: t(`${path}.type`),
    level: t(`${path}.level`),
    description: t(`${path}.description`),
  };
}

function todayCardFromMock(t: CoachingT): TodayCard {
  return {
    id: TODAY_SESSION.id,
    programCode: TODAY_SESSION.programCode,
    programName: TODAY_SESSION.programName,
    week: TODAY_SESSION.week,
    isDeload: false,
    dayLabel: t("today.mock.dayLabel"),
    title: t("today.mock.title"),
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

/** Demo has no assignment row: the library's active program stands in. */
function demoActive(library: ProgramListing[]): ActiveProgram | null {
  const p = library.find((row) => row.active);
  if (!p) return null;
  return {
    assignmentId: `demo-${p.id}`,
    programId: p.id,
    code: p.code,
    name: p.name,
    type: p.type,
    weeks: p.weeks,
    level: p.level,
    description: p.description,
    currentWeek: p.currentWeek ?? 1,
    coachName: p.coachName,
  };
}

function mockLibrary(t: CoachingT): ProgramListing[] {
  return [
    {
      id: "mock-str-12",
      code: "STR-12",
      name: "PR-Block",
      type: t("library.mock.STR-12.type"),
      weeks: 12,
      level: t("library.mock.STR-12.level"),
      description: t("library.mock.STR-12.description"),
      coachName: "Mikael Munk",
      active: true,
      currentWeek: 4,
      dayCount: 4,
    },
    {
      id: "mock-hyp-08",
      code: "HYP-08",
      name: "Build Phase",
      type: t("library.mock.HYP-08.type"),
      weeks: 8,
      level: t("library.mock.HYP-08.level"),
      description: t("library.mock.HYP-08.description"),
      coachName: "Maria",
      active: false,
      currentWeek: null,
      dayCount: 4,
    },
    {
      id: "mock-pwr-10",
      code: "PWR-10",
      name: "Powerbuilding",
      type: t("library.mock.PWR-10.type"),
      weeks: 10,
      level: t("library.mock.PWR-10.level"),
      description: t("library.mock.PWR-10.description"),
      coachName: "Kasper",
      active: false,
      currentWeek: null,
      dayCount: 4,
    },
    {
      id: "mock-dl-06",
      code: "DL-06",
      name: "Deadlift Spec.",
      type: t("library.mock.DL-06.type"),
      weeks: 6,
      level: t("library.mock.DL-06.level"),
      description: t("library.mock.DL-06.description"),
      coachName: "Mikael Munk",
      active: false,
      currentWeek: null,
      dayCount: 3,
    },
  ];
}
