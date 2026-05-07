import Link from "next/link";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { TODAY_SESSION, totalSets } from "@/lib/workout";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
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

const MOCK_UPCOMING = [
  { d: "I morgen", t: "Pause-bench, ringe-row, push-press", m: "55m" },
  { d: "Tor",      t: "Deadlift — opbygning til 90% af 1RM", m: "70m" },
  { d: "Fre",      t: "Hypertrofi: kvadriceps + skulder",     m: "45m" },
];

const MOCK_FEED = [
  { who: "@nina_dl",    what: "+2.5kg PR · Deadlift 175 kg", when: "lige nu", pr: true,  tier: "Beast" },
  { who: "@kasper_s",   what: "afsluttet uge 8 af PR-Block",  when: "12m",      pr: false, tier: "Athlete" },
  { who: "@maria.lift", what: "delt formcheck-video",         when: "32m",      pr: false, tier: "Beast" },
];

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
    })),
  };
}

function fmtUpcomingDate(iso: string | null): string {
  if (!iso) return "Snart";
  const d = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.getTime() === today.getTime()) return "I dag";
  if (d.getTime() === tomorrow.getTime()) return "I morgen";
  return d.toLocaleDateString("da-DK", { weekday: "short" }).replace(".", "");
}

export default async function TodayPage() {
  const member = (await getSession())!;

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

  // Tier promotion banner: surface latest unseen tier-up.
  const promotion = await getLatestUnseenPromotion(member.id);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      {/* Greeting */}
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <div className="eyebrow mb-2">God morgen</div>
          <h1 className="font-display text-[clamp(2rem,7vw,3.5rem)] leading-[0.95]">
            @{member.handle}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <div className="eyebrow mb-1">Streak</div>
          <div className="numeric text-3xl">{stats?.streakDays ?? 12}</div>
          <div className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">dage</div>
        </div>
      </header>

      {promotion ? (
        <TierBanner
          eventId={promotion.id}
          fromTier={promotion.fromTier}
          toTier={promotion.toTier}
        />
      ) : null}

      {reviewedCount > 0 ? (
        <Link
          href="/profile#form-checks"
          className="block surface-2 rounded-xl px-5 py-4 lift"
          style={{ borderColor: "var(--line-bright)" }}
        >
          <div className="flex items-center gap-3">
            <span className="pulse-dot" />
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                Mikael Munk har besvaret{" "}
                <span className="text-fg">
                  {reviewedCount} form-check{reviewedCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-0.5">
                Læs noter på din profil
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
        aria-label="Dagens session"
        className="surface-2 rounded-2xl overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4 border-b hairline">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="pulse-dot" />
            <span className="eyebrow">Dagens session · {today.programCode} · uge {today.week}</span>
            {today.isDeload ? (
              <span className="ml-auto numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                Deload
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
            <div className="eyebrow mb-1">Øvelser</div>
            <div className="numeric text-2xl">{today.exerciseCount}</div>
          </div>
          <div className="bg-bg-2 px-4 py-3">
            <div className="eyebrow mb-1">Sæt</div>
            <div className="numeric text-2xl">{today.setCount}</div>
          </div>
          <div className="bg-bg-2 px-4 py-3">
            <div className="eyebrow mb-1">Est. tid</div>
            <div className="numeric text-2xl">
              {today.estimatedMinutes}
              <span className="text-fg-dim text-sm">m</span>
            </div>
          </div>
        </div>

        <ul className="divide-y hairline">
          {today.exercises.map((ex, i) => (
            <li key={`${ex.name}-${i}`} className="px-5 py-3 flex items-center gap-4">
              <span className="numeric text-fg-faint text-xs w-6">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-fg/90 text-sm md:text-base truncate">{ex.name}</span>
              <span className="numeric text-fg-faint text-xs">{ex.setCount}× sæt</span>
            </li>
          ))}
        </ul>

        <div className="p-4 lg:p-5">
          <Link href={`/session/${today.id}`} className="btn btn-primary btn-xl">
            Start session →
          </Link>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">Volumen</div>
          <div className="numeric text-2xl lg:text-3xl">
            {stats ? formatVolume(stats.volumeKg) : "84.2K"}
          </div>
          <div className="text-[10px] font-mono text-fg-faint mt-1">kg · md.</div>
        </div>
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">PR&apos;er</div>
          <div className="numeric text-2xl lg:text-3xl">
            {stats ? String(stats.prsThisMonth).padStart(2, "0") : "03"}
          </div>
          <div className="text-[10px] font-mono text-fg-faint mt-1">denne md.</div>
        </div>
        <div className="bg-bg p-4 lg:p-5">
          <div className="eyebrow mb-2">Reps</div>
          <div className="numeric text-2xl lg:text-3xl">
            {stats ? formatReps(stats.repsBalance) : "1.420"}
          </div>
          <div className="text-[10px] font-mono text-fg-faint mt-1">{member.tier}</div>
        </div>
      </section>

      {/* Upcoming */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">Kommende sessioner</div>
          <Link href="/coaching" className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
            Se uge →
          </Link>
        </div>
        {upcoming && upcoming.length > 0 ? (
          <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
            {upcoming.map((row) => (
              <li key={row.id} className="px-4 py-3 flex items-center gap-4">
                <span className="eyebrow w-16 shrink-0">{fmtUpcomingDate(row.scheduledFor)}</span>
                <span className="flex-1 text-sm text-fg/90 truncate">{row.title}</span>
                <span className="numeric text-fg-faint text-xs shrink-0">{row.estimatedMinutes}m</span>
              </li>
            ))}
          </ul>
        ) : upcoming === null ? (
          <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
            {MOCK_UPCOMING.map((row) => (
              <li key={row.d} className="px-4 py-3 flex items-center gap-4">
                <span className="eyebrow w-16 shrink-0">{row.d}</span>
                <span className="flex-1 text-sm text-fg/90 truncate">{row.t}</span>
                <span className="numeric text-fg-faint text-xs shrink-0">{row.m}</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="surface-2 rounded-lg p-6 text-center text-sm text-fg-dim">
            Ingen sessioner planlagt. Din coach lægger nye sessioner snart.
          </div>
        )}
      </section>

      {/* Crew */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">Crew lige nu</div>
          <Link href="/community" className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg">
            Se feed →
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
            {MOCK_FEED.map((row, i) => (
              <CrewRow key={i} id={String(i)} {...row} />
            ))}
          </ul>
        ) : (
          <div className="surface-2 rounded-lg p-6 text-center text-sm text-fg-dim">
            Crewet er stille lige nu — vær den første til at dele.
            <div className="mt-3">
              <Link href="/community" className="btn btn-sm btn-primary">+ Del</Link>
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

function formatVolume(kg: number): string {
  if (kg <= 0) return "0";
  if (kg < 1000) return `${Math.round(kg)}`;
  return `${(kg / 1000).toFixed(1).replace(".", ",")}K`;
}

function formatReps(n: number): string {
  return new Intl.NumberFormat("da-DK").format(n);
}
