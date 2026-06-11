import Link from "next/link";
import { getTranslations } from "next-intl/server";
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
  type UpcomingSession,
  type CrewItem,
  type MemberStats,
} from "@/lib/data/dashboard";
import { ensureMemberStarter } from "@/lib/data/seed-member";
import { getMyFormChecks } from "@/lib/data/me";
import { getLatestUnseenPromotion } from "@/lib/data/tier-events";
import TierBanner from "@/components/app/TierBanner";
import FirstTimeTour from "@/components/app/FirstTimeTour";
import DailyCheckInCard from "@/components/nutrition/DailyCheckInCard";
import { getDailyCheckIn } from "@/lib/data/nutrition-checkin";
import MindTile from "@/components/mind/MindTile";
import {
  getOrCreateMentalSettings,
  getTodayMentalCoachOutput,
  hasMindCheckToday,
} from "@/lib/data/mind";

type Translator = Awaited<ReturnType<typeof getTranslations<"Dashboard">>>;

function mockUpcoming(t: Translator) {
  return [
    { d: t("upcoming.mock.tomorrowLabel"), t: t("upcoming.mock.tomorrowTitle"), m: "55m" },
    { d: t("upcoming.mock.thuLabel"),      t: t("upcoming.mock.thuTitle"),      m: "70m" },
    { d: t("upcoming.mock.friLabel"),      t: t("upcoming.mock.friTitle"),      m: "45m" },
  ];
}

function mockFeed(t: Translator) {
  return [
    { who: "@nina_dl",    what: t("crew.mock.ninaWhat"),   when: t("crew.mock.ninaWhen"),   pr: true,  tier: "Beast" },
    { who: "@kasper_s",   what: t("crew.mock.kasperWhat"), when: t("crew.mock.kasperWhen"), pr: false, tier: "Athlete" },
    { who: "@maria.lift", what: t("crew.mock.mariaWhat"),  when: t("crew.mock.mariaWhen"),  pr: false, tier: "Beast" },
  ];
}

function todayCardFromMock(): TodayCard {
  return {
    id: TODAY_SESSION.id,
    programCode: TODAY_SESSION.programCode,
    programName: TODAY_SESSION.programName,
    week: TODAY_SESSION.week,
    isDeload: false,
    dayLabel: TODAY_SESSION.dayLabel,
    title: TODAY_SESSION.title,
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

function fmtUpcomingDate(iso: string | null, t: Translator): string {
  if (!iso) return t("upcoming.soon");
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.getTime() === today.getTime()) return t("upcoming.today");
  if (d.getTime() === tomorrow.getTime()) return t("upcoming.tomorrow");
  return d.toLocaleDateString("da-DK", { weekday: "short" }).replace(".", "");
}

/** One-word Danish readiness labels for the compact dashboard chip. */
const HRV_CHIP_LABEL: Record<ReadinessBucket, string> = {
  very_low: "Lav",
  low: "Lav",
  normal: "Normal",
  high: "Høj",
  very_high: "Høj",
};

type HrvChipData = {
  rmssdMs: number;
  readiness: string | null;
};

/**
 * Latest HRV reading for the dashboard chip. Returns null in demo mode
 * or when the member has no synced readings (no wearable connection /
 * first sync pending) — the chip then shows a "Forbind wearable" CTA.
 */
async function getHrvChipData(memberId: string): Promise<HrvChipData | null> {
  if (!SUPABASE_ENABLED) return null;
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

  const bucket = (data.readiness_bucket as ReadinessBucket | null) ?? null;
  return {
    rmssdMs: data.rmssd_ms as number,
    readiness: bucket ? HRV_CHIP_LABEL[bucket] : null,
  };
}

export default async function TodayPage() {
  const member = (await getSession())!;
  const t = await getTranslations("Dashboard");

  let today: TodayCard;
  let upcoming: UpcomingSession[] | null = null;
  let feed: CrewItem[] | null = null;
  let stats: MemberStats | null = null;

  if (SUPABASE_ENABLED) {
    await ensureMemberStarter(member.id);
    const [t, u, f, s] = await Promise.all([
      getTodayCard(member.id),
      getUpcomingSessions(member.id, 3),
      getRecentFeed(3),
      getMemberStats(member.id),
    ]);
    today = t ?? todayCardFromMock();
    upcoming = u;
    feed = f;
    stats = s;
  } else {
    today = todayCardFromMock();
  }

  // Coach-review notification: surface a banner when there are new
  // form-checks with coach notes the member hasn't seen yet. (No
  // "read" state in v1, so we just show count of reviewed-with-notes.)
  const myChecks = await getMyFormChecks(member.id, 5);
  const reviewedCount = myChecks.filter(
    (c) => c.reviewedAt && c.coachNotes
  ).length;

  // Daily nutrition check-in. Renders only when there's a meal slot
  // to surface; the component itself returns null on "no-plan".
  const checkin = await getDailyCheckIn(member.id);

  // Tier promotion banner: surface latest unseen tier-up.
  const promotion = await getLatestUnseenPromotion(member.id);

  // HRV readiness chip: latest synced reading, or a connect CTA.
  const hrv = await getHrvChipData(member.id);

  // Mind module tile (B-layer): surface today's state to the dashboard.
  const [mindChecked, coachOutput, mentalSettings] = await Promise.all([
    hasMindCheckToday(member.id),
    getTodayMentalCoachOutput(member.id),
    getOrCreateMentalSettings(member.id),
  ]);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <FirstTimeTour />
      {/* Greeting */}
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <div className="eyebrow mb-2">{t("greeting.eyebrow")}</div>
          <h1 className="font-display text-[clamp(2rem,7vw,3.5rem)] leading-[0.95]">
            @{member.handle}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <div className="eyebrow mb-1">{t("greeting.streakLabel")}</div>
          <div className="numeric text-3xl">{stats?.streakDays ?? 12}</div>
          <div className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">{t("greeting.streakUnit")}</div>
        </div>
      </header>

      {promotion ? (
        <TierBanner
          eventId={promotion.id}
          fromTier={promotion.fromTier}
          toTier={promotion.toTier}
        />
      ) : null}

      <DailyCheckInCard checkin={checkin} variant="compact" />

      <MindTile
        hasMindCheckToday={mindChecked}
        hasCoachOutputToday={!!coachOutput}
        currentStreak={mentalSettings.current_streak_days}
      />

      <HrvChip hrv={hrv} />

      <InstallHint />

      {reviewedCount > 0 ? (
        <Link
          href="/profile#form-checks"
          data-domain="body"
          className="block surface-2 rounded-xl px-5 py-4 lift"
          style={{ borderColor: "var(--line-bright)" }}
        >
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
      ) : null}

      {/* Today's session */}
      <section
        aria-label={t("todaySession.ariaLabel")}
        data-domain="body"
        className="surface-2 rounded-2xl overflow-hidden"
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
              <span className="text-fg-dim text-sm">m</span>
            </div>
          </div>
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

        <div className="p-4 lg:p-5">
          <Link href={`/session/${today.id}`} className="btn btn-primary btn-xl">
            {t("todaySession.start")}
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">{t("stats.volume")}</div>
          <div className="numeric text-2xl lg:text-3xl">
            {stats ? formatVolume(stats.volumeKg) : "84.2K"}
          </div>
          <div className="text-[10px] font-mono text-fg-faint mt-1 flex items-center gap-1">
            <span>{t("stats.volumeMeta")}</span>
            {stats ? (
              <TrendArrow current={stats.volumeKg} previous={stats.volumeKgPrev} t={t} />
            ) : null}
          </div>
        </div>
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">{t("stats.prs")}</div>
          <div className="numeric text-2xl lg:text-3xl">
            {stats ? String(stats.prs4w).padStart(2, "0") : "03"}
          </div>
          <div className="text-[10px] font-mono text-fg-faint mt-1 flex items-center gap-1">
            <span>{t("stats.prsMeta")}</span>
            {stats ? (
              <TrendArrow current={stats.prs4w} previous={stats.prsPrev} t={t} />
            ) : null}
          </div>
        </div>
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">{t("stats.reps")}</div>
          <div className="numeric text-2xl lg:text-3xl">
            {stats ? formatReps(stats.repsBalance) : "1.420"}
          </div>
          <div className="text-[10px] font-mono text-fg-faint mt-1">{member.tier}</div>
        </div>
      </section>

      {/* Upcoming */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">{t("upcoming.title")}</div>
          <Link href="/coaching" className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
            {t("upcoming.seeWeek")}
          </Link>
        </div>
        {upcoming && upcoming.length > 0 ? (
          <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
            {upcoming.map((row) => (
              <li key={row.id}>
                <Link
                  href={`/session/${row.id}`}
                  className="px-4 py-3 flex items-center gap-4 lift"
                >
                  <span className="eyebrow w-16 shrink-0">{fmtUpcomingDate(row.scheduledFor, t)}</span>
                  <span className="flex-1 text-sm text-fg/90 truncate">{row.title}</span>
                  <span className="numeric text-fg-faint text-xs shrink-0">{row.estimatedMinutes}m</span>
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

      {/* Crew */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">{t("crew.title")}</div>
          <Link href="/community" className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
            {t("crew.seeFeed")}
          </Link>
        </div>
        {feed && feed.length > 0 ? (
          <ul className="space-y-2.5">
            {feed.map((row) => (
              <CrewRow key={row.id} {...row} />
            ))}
          </ul>
        ) : feed === null ? (
          <ul className="space-y-2.5">
            {mockFeed(t).map((row, i) => (
              <CrewRow key={i} id={String(i)} {...row} />
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
    </Container>
  );
}

function CrewRow({
  who, what, when, pr,
}: Pick<CrewItem, "id" | "who" | "what" | "when" | "pr"> & { tier?: string }) {
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
          ★ PR
        </span>
      ) : null}
    </li>
  );
}

/**
 * Compact HRV readiness chip. Links to `/hrv`. With a synced reading
 * it shows the latest RMSSD + a one-word readiness label; otherwise it
 * surfaces a "Forbind wearable" CTA (demo mode / no connection).
 */
function HrvChip({ hrv }: { hrv: HrvChipData | null }) {
  return (
    <Link
      href="/hrv"
      data-domain="heart"
      className="block surface-2 rounded-lg px-5 py-4 lift group"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="eyebrow eyebrow-domain mb-1.5">HRV readiness</div>
          {hrv ? (
            <div className="flex items-baseline gap-2">
              <span className="numeric text-2xl lg:text-3xl">
                {Math.round(hrv.rmssdMs)}
                <span className="text-fg-dim text-sm ml-1">ms</span>
              </span>
              {hrv.readiness ? (
                <span className="text-sm text-fg-dim">· {hrv.readiness}</span>
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-fg/90">Forbind wearable</div>
          )}
        </div>
        <span className="text-fg-dim group-hover:text-fg shrink-0" aria-hidden>
          →
        </span>
      </div>
    </Link>
  );
}

function formatVolume(kg: number): string {
  if (kg <= 0) return "0";
  if (kg < 1000) return `${Math.round(kg)}`;
  return `${(kg / 1000).toFixed(1).replace(".", ",")}K`;
}

function formatReps(n: number): string {
  return new Intl.NumberFormat("da-DK").format(n);
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
