import Link from "next/link";
import Container from "@/components/Container";
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
  getActiveProgram,
  getProgramLibrary,
  getSessionStreak,
  getWeekStrip,
  mockWeekStrip,
  type ActiveProgram,
  type ProgramListing,
  type WeekDay,
} from "@/lib/data/coaching";
import StartProgramButton from "./StartProgramButton";

export default async function TrainPage() {
  const member = await getSession();
  const memberId = member?.id ?? null;

  const [todayCardDb, weekDb, activeDb, libraryDb, statsDb, streakDb] =
    SUPABASE_ENABLED && memberId
      ? await Promise.all([
          getTodayCard(memberId),
          getWeekStrip(memberId),
          getActiveProgram(memberId),
          getProgramLibrary(memberId),
          getMemberStats(memberId),
          getSessionStreak(memberId),
        ])
      : ([null, null, null, null, null, 0] as const);

  const today: TodayCard = todayCardDb ?? todayCardFromMock();
  const week: WeekDay[] = weekDb ?? mockWeekStrip();
  const active: ActiveProgram | null = activeDb;
  const library: ProgramListing[] = libraryDb ?? mockLibrary();
  const sets = today.setCount > 0 ? today.setCount : totalSets(TODAY_SESSION);

  const volumeKg = statsDb?.volumeKg ?? 0;
  const volumeKgPrev = statsDb?.volumeKgPrev ?? 0;
  const prs4w = statsDb?.prs4w ?? 0;
  const prsPrev = statsDb?.prsPrev ?? 0;
  // Prefer the dedicated streak getter; fall back to the stats one.
  const streakDays = streakDb || statsDb?.streakDays || 0;

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2 pb-1">
        <div className="eyebrow mb-2">02 — Træn</div>
        <h1 className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[0.92]">
          Din uge.
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          Alt automatisk planlagt af AI&apos;en, justeret af din coach, og tilpasset dig.
        </p>
      </header>

      {/* Week strip — horizontal scroll on mobile */}
      <section
        aria-label="Ugeoversigt"
        className="-mx-6 md:mx-0 px-6 md:px-0 overflow-x-auto"
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
                <div className="eyebrow mb-1.5">{day.label}</div>
                <div className="numeric text-2xl mb-1">
                  {String(day.date).padStart(2, "0")}
                </div>
                <div
                  className={`text-[10px] font-mono uppercase tracking-[0.14em] ${
                    day.rest ? "text-fg-faint" : "text-fg-dim"
                  }`}
                >
                  {day.sessionLabel}
                </div>
                <div className="mt-2 flex justify-center">
                  {day.done ? (
                    <span
                      className="size-2 rounded-full bg-fg"
                      aria-label="Gennemført"
                    />
                  ) : day.today ? (
                    <span className="pulse-dot" aria-label="I dag" />
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

      {/* Today's session — flagship CTA */}
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-4 border-b hairline">
          <div className="flex items-center gap-2 mb-3">
            <span className="pulse-dot" />
            <span className="eyebrow">
              I dag · {today.programCode} · uge {today.week}
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-2">
            {today.dayLabel}
          </h2>
          <p className="text-fg-dim text-sm md:text-base">{today.title}</p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-line border-b hairline">
          <Mini label="Øvelser" value={today.exerciseCount} />
          <Mini label="Sæt" value={sets} />
          <Mini label="Est. tid" value={today.estimatedMinutes} suffix="m" />
        </div>

        <div className="p-4 lg:p-5">
          <Link href={`/session/${today.id}`} className="btn btn-primary btn-xl">
            Start session →
          </Link>
        </div>
      </section>

      {/* Active program progress */}
      {active ? (
        <section className="surface-2 rounded-2xl p-5 lg:p-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="eyebrow mb-1">Aktivt program</div>
              <div className="font-display text-2xl md:text-3xl">{active.name}</div>
            </div>
            <div className="text-right">
              <div className="numeric text-3xl">
                {String(active.currentWeek).padStart(2, "0")}{" "}
                <span className="text-fg-dim text-base">/ {active.weeks}</span>
              </div>
              <div className="eyebrow">uger</div>
            </div>
          </div>
          <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-fg"
              style={{
                width: `${Math.min(100, (active.currentWeek / active.weeks) * 100)}%`,
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
            <MiniWithTrend
              label="Volumen · 4u"
              value={formatVolume(volumeKg)}
              suffix={volumeKg >= 1000 ? "" : "kg"}
              current={volumeKg}
              previous={volumeKgPrev}
            />
            <MiniWithTrend
              label="PR'er · 4u"
              value={String(prs4w).padStart(2, "0")}
              current={prs4w}
              previous={prsPrev}
            />
            <Mini label="Streak" value={streakDays} suffix="d" small />
          </div>
        </section>
      ) : null}

      {/* Programs library */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">Programmer</div>
          <span className="text-xs font-mono text-fg-faint">{library.length}</span>
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
                        <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border hairline-strong">
                          <span className="size-1.5 rounded-full bg-fg" /> Aktiv
                          · uge {p.currentWeek}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="font-display text-2xl md:text-3xl leading-[1] truncate">
                      {p.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="numeric text-2xl">{p.weeks}</div>
                    <div className="eyebrow">uger</div>
                  </div>
                </div>

                {p.description ? (
                  <p className="text-fg-dim text-sm leading-relaxed mb-4">
                    {p.description}
                  </p>
                ) : null}

                <div className="grid grid-cols-2 gap-px bg-line border hairline rounded-lg overflow-hidden mb-4">
                  <div className="bg-bg-2 px-3 py-2.5">
                    <div className="eyebrow mb-0.5">Coach</div>
                    <div className="text-sm">{p.coachName ?? "AI + team"}</div>
                  </div>
                  <div className="bg-bg-2 px-3 py-2.5">
                    <div className="eyebrow mb-0.5">Niveau</div>
                    <div className="text-sm">{p.level ?? "—"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.active ? (
                    <Link
                      href={`/session/${today.id}`}
                      className="btn btn-primary btn-sm flex-1"
                    >
                      Fortsæt →
                    </Link>
                  ) : (
                    <StartProgramButton
                      programId={p.id}
                      programName={p.name}
                      hasOtherActive={Boolean(active)}
                    />
                  )}
                  <button type="button" className="btn btn-sm" disabled>
                    Detaljer
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* 1:1 — only fully human */}
      <section className="surface-2 rounded-2xl p-6 lg:p-10">
        <div className="eyebrow mb-3">
          1:1 Coaching · Den eneste 100% menneskelige del
        </div>
        <h3 className="font-display text-2xl md:text-4xl leading-[1] mb-3">
          Vil du have Mikael Munk i dit øre direkte?
        </h3>
        <p className="text-fg-dim text-sm md:text-base max-w-xl mb-5">
          Personligt program, ugentlige form-checks via video, og direkte adgang
          over Signal. {pricing.oneOnOne.spots} ind ad gangen.
        </p>

        <div className="flex items-baseline gap-2 mb-5">
          <span className="numeric text-3xl">{pricing.oneOnOne.amount}</span>
          <span className="numeric text-fg-dim text-sm">
            {pricing.oneOnOne.currency}/{pricing.oneOnOne.period} oven i medlemskabet
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/billing" className="btn btn-primary">
            Søg om plads →
          </Link>
          <button type="button" className="btn">Læs mere</button>
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
      <div className={`numeric ${small ? "text-xl lg:text-2xl" : "text-2xl"}`}>
        {value}
        {suffix ? <span className="text-fg-dim text-sm ml-0.5">{suffix}</span> : null}
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
}: {
  label: string;
  value: number | string;
  suffix?: string;
  current: number;
  previous: number;
}) {
  const trend = computeTrend(current, previous);
  return (
    <div className="bg-bg-2 px-4 py-3 text-center">
      <div className="eyebrow mb-1">{label}</div>
      <div className="numeric text-xl lg:text-2xl">
        {value}
        {suffix ? <span className="text-fg-dim text-sm ml-0.5">{suffix}</span> : null}
      </div>
      {trend ? (
        <div
          className={`mt-0.5 text-[10px] font-mono ${
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

function computeTrend(
  current: number,
  previous: number
): { direction: "up" | "down" | "flat"; label: string } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { direction: "up", label: "↑ ny" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (Math.abs(pct) < 3) return { direction: "flat", label: "·" };
  return {
    direction: pct > 0 ? "up" : "down",
    label: `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}%`,
  };
}

/* ---------------------------------------------------------------- *
 * Volume formatting: 84_200 → "84.2K", 950 → "950"
 * ---------------------------------------------------------------- */

function formatVolume(kg: number): string {
  if (kg >= 1000) {
    const thousands = kg / 1000;
    // 84.231 → "84.2"; 100.0 → "100"; locale uses dot for the K-form
    const fixed = thousands >= 100 ? thousands.toFixed(0) : thousands.toFixed(1);
    return `${fixed}K`;
  }
  return Math.round(kg).toString();
}

/* ---------------------------------------------------------------- *
 * Mock fallbacks (mirror the previous static markup so demo mode and
 * unconnected sessions still render the page).
 * ---------------------------------------------------------------- */

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

function mockLibrary(): ProgramListing[] {
  return [
    {
      id: "mock-str-12",
      code: "STR-12",
      name: "PR-Block",
      type: "Strength",
      weeks: 12,
      level: "Inter./Adv.",
      description:
        "Klassisk linær periodisering med RPE. Bygget til nye PR'er på squat, bench og DL.",
      coachName: "Mikael Munk",
      active: true,
      currentWeek: 4,
    },
    {
      id: "mock-hyp-08",
      code: "HYP-08",
      name: "Build Phase",
      type: "Hypertrofi",
      weeks: 8,
      level: "All levels",
      description:
        "Volumen-fokuseret blok med bro-split logik for ben, ryg og skuldre.",
      coachName: "Maria",
      active: false,
      currentWeek: null,
    },
    {
      id: "mock-pwr-10",
      code: "PWR-10",
      name: "Powerbuilding",
      type: "Hybrid",
      weeks: 10,
      level: "Intermediate",
      description:
        "50/50 strength og hypertrofi. Tunge top-sets, accessory til æstetik.",
      coachName: "Kasper",
      active: false,
      currentWeek: null,
    },
    {
      id: "mock-dl-06",
      code: "DL-06",
      name: "Deadlift Spec.",
      type: "Specialization",
      weeks: 6,
      level: "Advanced",
      description:
        "Seks uger fokuseret 100% på dødløft. Pause-pulls, deficits, peak-protokol.",
      coachName: "Mikael Munk",
      active: false,
      currentWeek: null,
    },
  ];
}
