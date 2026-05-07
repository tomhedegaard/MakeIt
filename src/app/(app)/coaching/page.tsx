import Link from "next/link";
import Container from "@/components/Container";
import { pricing } from "@/lib/pricing";
import { TODAY_SESSION, totalSets } from "@/lib/workout";

const WEEK = [
  { d: "Man", date: 4, label: "Squat",      done: true,  rest: false },
  { d: "Tir", date: 5, label: "Push",       done: false, today: true,  rest: false },
  { d: "Ons", date: 6, label: "Pull",       done: false, rest: false },
  { d: "Tor", date: 7, label: "Deadlift",   done: false, rest: false },
  { d: "Fre", date: 8, label: "Hyper",      done: false, rest: false },
  { d: "Lør", date: 9, label: "Hvile",      done: false, rest: true  },
  { d: "Søn", date: 10, label: "Aktiv",     done: false, rest: true  },
];

const PROGRAMS = [
  {
    code: "STR-12", name: "PR-Block",  type: "Strength",       weeks: 12, coach: "Anton",  level: "Inter./Adv.",
    desc: "Klassisk linær periodisering med RPE. Bygget til nye PR'er på squat, bench og DL.",
    active: true, week: 4,
  },
  {
    code: "HYP-08", name: "Build Phase", type: "Hypertrofi",   weeks: 8,  coach: "Maria",  level: "All levels",
    desc: "Volumen-fokuseret blok med bro-split logik for ben, ryg og skuldre.",
    active: false,
  },
  {
    code: "PWR-10", name: "Powerbuilding", type: "Hybrid",     weeks: 10, coach: "Kasper", level: "Intermediate",
    desc: "50/50 strength og hypertrofi. Tunge top-sets, accessory til æstetik.",
    active: false,
  },
  {
    code: "DL-06",  name: "Deadlift Spec.", type: "Specialization", weeks: 6, coach: "Anton", level: "Advanced",
    desc: "Seks uger fokuseret 100% på dødløft. Pause-pulls, deficits, peak-protokol.",
    active: false,
  },
];

export default function TrainPage() {
  const today = TODAY_SESSION;
  const sets = totalSets(today);

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
          {WEEK.map((day) => {
            const isToday = !!day.today;
            return (
              <li key={day.date} className="shrink-0 md:shrink">
                <div
                  className="surface-2 rounded-xl p-3 md:p-4 w-[78px] md:w-auto text-center lift"
                  data-active={isToday}
                  style={{
                    background: isToday ? "var(--bg-3)" : undefined,
                    borderColor: isToday ? "var(--line-bright)" : undefined,
                  }}
                >
                  <div className="eyebrow mb-1.5">{day.d}</div>
                  <div className="numeric text-2xl mb-1">
                    {String(day.date).padStart(2, "0")}
                  </div>
                  <div className={`text-[10px] font-mono uppercase tracking-[0.14em] ${day.rest ? "text-fg-faint" : "text-fg-dim"}`}>
                    {day.label}
                  </div>
                  <div className="mt-2 flex justify-center">
                    {day.done ? (
                      <span className="size-2 rounded-full bg-fg" aria-label="Gennemført" />
                    ) : isToday ? (
                      <span className="pulse-dot" aria-label="I dag" />
                    ) : day.rest ? (
                      <span className="size-2 rounded-full bg-fg-faint" aria-hidden />
                    ) : (
                      <span className="size-2 rounded-full border hairline-strong" aria-hidden />
                    )}
                  </div>
                </div>
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
            <span className="eyebrow">I dag · {today.programCode} · uge {today.week}</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-2">
            {today.dayLabel}
          </h2>
          <p className="text-fg-dim text-sm md:text-base">{today.title}</p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-line border-b hairline">
          <Mini label="Øvelser" value={today.exercises.length} />
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
      <section className="surface-2 rounded-2xl p-5 lg:p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="eyebrow mb-1">Aktivt program</div>
            <div className="font-display text-2xl md:text-3xl">PR-Block</div>
          </div>
          <div className="text-right">
            <div className="numeric text-3xl">04 <span className="text-fg-dim text-base">/ 12</span></div>
            <div className="eyebrow">uger</div>
          </div>
        </div>
        <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
          <div className="h-full bg-fg" style={{ width: `${(4 / 12) * 100}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-px bg-line border hairline rounded-lg overflow-hidden">
          <Mini label="Volumen" value="84.2K" suffix="kg" small />
          <Mini label="PR'er" value="03" small />
          <Mini label="Streak" value="12" suffix="d" small />
        </div>
      </section>

      {/* Programs library */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">Programmer</div>
          <span className="text-xs font-mono text-fg-faint">{PROGRAMS.length}</span>
        </div>

        <ul className="space-y-3">
          {PROGRAMS.map((p) => (
            <li key={p.code}>
              <article className="surface-2 rounded-2xl p-5 lg:p-6 lift">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0">
                    <div className="eyebrow mb-2">
                      {p.code} · {p.type}
                      {p.active ? (
                        <span className="ml-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border hairline-strong">
                          <span className="size-1.5 rounded-full bg-fg" /> Aktiv · uge {p.week}
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

                <p className="text-fg-dim text-sm leading-relaxed mb-4">{p.desc}</p>

                <div className="grid grid-cols-2 gap-px bg-line border hairline rounded-lg overflow-hidden mb-4">
                  <div className="bg-bg-2 px-3 py-2.5">
                    <div className="eyebrow mb-0.5">Coach</div>
                    <div className="text-sm">{p.coach}</div>
                  </div>
                  <div className="bg-bg-2 px-3 py-2.5">
                    <div className="eyebrow mb-0.5">Niveau</div>
                    <div className="text-sm">{p.level}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {p.active ? (
                    <Link href={`/session/${today.id}`} className="btn btn-primary btn-sm flex-1">
                      Fortsæt →
                    </Link>
                  ) : (
                    <button type="button" className="btn btn-sm flex-1">
                      Start program
                    </button>
                  )}
                  <button type="button" className="btn btn-sm">
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
          Vil du have Anton i dit øre direkte?
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
