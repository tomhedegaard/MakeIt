import Container from "@/components/Container";
import PostComposer from "@/components/community/PostComposer";

const STORIES = [
  { who: "@anton",      tier: "Legend",  trained: true },
  { who: "@nina_dl",    tier: "Beast",   trained: true },
  { who: "@kasper_s",   tier: "Athlete", trained: true },
  { who: "@maria.lift", tier: "Beast",   trained: true },
  { who: "@frederik",   tier: "Lifter",  trained: false },
  { who: "@signe",      tier: "Athlete", trained: true },
  { who: "@oliver",     tier: "Lifter",  trained: false },
];

const FEED = [
  {
    who: "@nina_dl", tier: "Beast",
    what: "Ny DL PR — 175 kg @ 68 kg BW. Brugte sorte StrapIts, hænderne overlevede.",
    when: "2m", pr: true, reps: 84, comments: 12,
  },
  {
    who: "@kasper_s", tier: "Athlete",
    what: "Afsluttet uge 8 af PR-Block. Squat top single 162.5 kg, sad let.",
    when: "1t", pr: false, reps: 41, comments: 5,
  },
  {
    who: "@maria.lift", tier: "Beast",
    what: "Form-check video uploadet — bench-pause med 90 kg. Tager gerne kommentarer.",
    when: "3t", pr: false, reps: 28, comments: 8, formcheck: true,
  },
  {
    who: "@anton", tier: "Legend",
    what: "Limited cuff-farve drops på fredag — kun for crewet. Olive er tilbage.",
    when: "5t", pr: false, reps: 122, comments: 31,
  },
  {
    who: "@frederik", tier: "Lifter",
    what: "Første dag på Build Phase. 4 sæt squat. Allerede pumped.",
    when: "8t", pr: false, reps: 12, comments: 3,
  },
];

const LEADERBOARD = [
  { rank: "01", who: "@nina_dl",    score: "412.5", lift: "Total · kg" },
  { rank: "02", who: "@kasper_s",   score: "405.0", lift: "Total · kg" },
  { rank: "03", who: "@maria.lift", score: "382.5", lift: "Total · kg" },
  { rank: "04", who: "@anton",      score: "377.5", lift: "Total · kg" },
  { rank: "05", who: "@frederik",   score: "340.0", lift: "Total · kg" },
];

export default function CrewPage() {
  return (
    <Container className="py-6 lg:py-12 space-y-8">
      {/* Header + post composer */}
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <div className="eyebrow mb-2">03 — Crew</div>
          <h1 className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[0.92]">
            Live feed.
          </h1>
        </div>
        <PostComposer
          trigger={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              aria-label="Del med crewet"
            >
              + Del
            </button>
          }
        />
      </header>

      {/* Story strip — who trained today */}
      <section
        aria-label="Crew der træner i dag"
        className="-mx-6 md:mx-0 px-6 md:px-0 overflow-x-auto"
      >
        <ol className="flex gap-3 md:gap-4 min-w-max md:flex-wrap md:min-w-0">
          {STORIES.map((s) => (
            <li key={s.who} className="shrink-0 text-center">
              <div className="relative size-14 md:size-16 mx-auto mb-2">
                <div
                  className={`absolute inset-0 rounded-full ${s.trained ? "bg-fg/20" : "bg-line"}`}
                  style={{
                    padding: 2,
                    background: s.trained
                      ? "conic-gradient(from 0deg, var(--fg) 0deg, var(--fg) 280deg, transparent 280deg)"
                      : undefined,
                  }}
                />
                <div className="absolute inset-[2px] rounded-full bg-bg-2 flex items-center justify-center text-[11px] font-mono uppercase">
                  {s.who.slice(1, 3).toUpperCase()}
                </div>
              </div>
              <div className="text-[10px] font-mono text-fg-dim">{s.who.replace("@", "")}</div>
              <div className="text-[9px] font-mono text-fg-faint uppercase tracking-[0.14em]">
                {s.trained ? "Trænede" : "Hviler"}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Monthly challenge hero */}
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">Maj challenge · 11 dage tilbage</div>
            <span className="numeric text-xs text-fg-dim">128 deltagere</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-3">
            100K Volumen Club
          </h2>
          <p className="text-fg-dim text-sm">
            Løft 100.000 kg samlet volumen i maj og bliv medlem af 100K-klubben.
            Belønning: limited cuff i sølv + 1.000 Reps.
          </p>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="numeric text-2xl">68.4 / 100K</span>
            <span className="text-xs font-mono text-fg-dim">Du · 68%</span>
          </div>
          <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
            <div className="h-full bg-fg" style={{ width: "68.4%" }} />
          </div>
        </div>
        <div className="border-t hairline grid grid-cols-2">
          <button type="button" className="px-5 py-4 text-left hover:bg-bg-3 border-r hairline">
            <div className="eyebrow mb-1">Belønning</div>
            <div className="text-sm">Limited sølv-cuff + 1.000 Reps</div>
          </button>
          <button type="button" className="px-5 py-4 text-left hover:bg-bg-3">
            <div className="eyebrow mb-1">Status</div>
            <div className="text-sm">Tilmeldt — på vej</div>
          </button>
        </div>
      </section>

      {/* Feed */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">Live feed</div>
          <span className="text-xs font-mono text-fg-faint">Senest opdateret · nu</span>
        </div>
        <ul className="space-y-3">
          {FEED.map((f, i) => (
            <li key={i}>
              <article className="surface-2 rounded-2xl p-5 lift">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                      {f.who.slice(1, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm truncate">{f.who}</div>
                      <div className="eyebrow text-[10px]">{f.tier}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {f.pr ? (
                      <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                        ★ PR
                      </span>
                    ) : null}
                    {f.formcheck ? (
                      <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                        AI
                      </span>
                    ) : null}
                    <span className="numeric text-xs text-fg-faint">{f.when}</span>
                  </div>
                </div>

                <p className="text-fg/90 text-sm md:text-base leading-relaxed mb-4">
                  {f.what}
                </p>

                {f.formcheck ? (
                  <div className="surface rounded-xl p-3 mb-4 flex items-center gap-3">
                    <div className="size-12 rounded bg-bg-3 flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="size-5 text-fg-dim" fill="none" aria-hidden>
                        <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                        <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                        <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-fg-dim">Form-check video · 0:14</div>
                      <div className="text-sm">Bench Press · AI score 87/100</div>
                    </div>
                    <button type="button" className="btn btn-sm">Se</button>
                  </div>
                ) : null}

                <div className="border-t hairline pt-3 flex items-center gap-1 text-xs font-mono text-fg-dim">
                  <button type="button" className="px-3 py-1.5 rounded-md hover:text-fg hover:bg-bg-3 flex items-center gap-2">
                    <span>+</span>
                    <span className="numeric">{f.reps}</span>
                    <span>Reps</span>
                  </button>
                  <button type="button" className="px-3 py-1.5 rounded-md hover:text-fg hover:bg-bg-3 flex items-center gap-2">
                    <span className="numeric">{f.comments}</span>
                    <span>Kommentar</span>
                  </button>
                  <button type="button" className="ml-auto px-3 py-1.5 rounded-md hover:text-fg hover:bg-bg-3">
                    Del
                  </button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Leaderboard */}
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b hairline flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">Leaderboard</div>
            <div className="font-display text-2xl">Top atleter</div>
          </div>
          <span className="eyebrow">Maj 2026</span>
        </div>
        <ul className="divide-y hairline">
          {LEADERBOARD.map((row, i) => (
            <li key={row.rank} className="px-5 py-3 flex items-center gap-4 text-sm">
              <span className="numeric text-fg-faint w-7">{row.rank}</span>
              <div className="size-8 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                {row.who.slice(1, 3).toUpperCase()}
              </div>
              <span className="flex-1 truncate">{row.who}</span>
              <span className="numeric text-fg/90">{row.score}</span>
              <span className="text-[10px] font-mono text-fg-faint hidden sm:inline">{row.lift}</span>
              {i < 3 ? (
                <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                  ★
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {/* IRL meet */}
      <section className="surface-2 rounded-2xl p-5">
        <div className="eyebrow mb-2">Næste IRL-meet</div>
        <div className="font-display text-2xl mb-1">Open House — Amagerbro</div>
        <p className="text-sm text-fg-dim mb-4">
          Lørdag 24/05 · Engvej 169 · Træning, kaffe, og en sneak peek af nye produkter.
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary btn-sm flex-1">RSVP</button>
          <button type="button" className="btn btn-sm">Læs mere</button>
        </div>
      </section>
    </Container>
  );
}
