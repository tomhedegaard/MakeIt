import Container from "@/components/Container";
import PostComposer from "@/components/community/PostComposer";
import PostCard from "@/components/community/PostCard";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getFeedPosts, type FeedPost } from "@/lib/data/community";

const STORIES = [
  { who: "@anton",      tier: "Legend",  trained: true },
  { who: "@nina_dl",    tier: "Beast",   trained: true },
  { who: "@kasper_s",   tier: "Athlete", trained: true },
  { who: "@maria.lift", tier: "Beast",   trained: true },
  { who: "@frederik",   tier: "Lifter",  trained: false },
  { who: "@signe",      tier: "Athlete", trained: true },
  { who: "@oliver",     tier: "Lifter",  trained: false },
];

const MOCK_FEED: FeedPost[] = [
  {
    id: "m1", who: "@nina_dl", tier: "Beast",
    content: "Ny DL PR — 175 kg @ 68 kg BW. Brugte sorte StrapIts, hænderne overlevede.",
    tag: "PR", isPr: true, whenLabel: "2m",
    reactionsCount: 84, commentsCount: 12, reactedByMe: false,
  },
  {
    id: "m2", who: "@kasper_s", tier: "Athlete",
    content: "Afsluttet uge 8 af PR-Block. Squat top single 162.5 kg, sad let.",
    tag: null, isPr: false, whenLabel: "1t",
    reactionsCount: 41, commentsCount: 5, reactedByMe: false,
  },
  {
    id: "m3", who: "@maria.lift", tier: "Beast",
    content: "Form-check video uploadet — bench-pause med 90 kg. Tager gerne kommentarer.",
    tag: "Form-check", isPr: false, formcheck: true, whenLabel: "3t",
    reactionsCount: 28, commentsCount: 8, reactedByMe: false,
  },
  {
    id: "m4", who: "@anton", tier: "Legend",
    content: "Limited cuff-farve drops på fredag — kun for crewet. Olive er tilbage.",
    tag: null, isPr: false, whenLabel: "5t",
    reactionsCount: 122, commentsCount: 31, reactedByMe: false,
  },
  {
    id: "m5", who: "@frederik", tier: "Lifter",
    content: "Første dag på Build Phase. 4 sæt squat. Allerede pumped.",
    tag: null, isPr: false, whenLabel: "8t",
    reactionsCount: 12, commentsCount: 3, reactedByMe: false,
  },
];

const LEADERBOARD = [
  { rank: "01", who: "@nina_dl",    score: "412.5", lift: "Total · kg" },
  { rank: "02", who: "@kasper_s",   score: "405.0", lift: "Total · kg" },
  { rank: "03", who: "@maria.lift", score: "382.5", lift: "Total · kg" },
  { rank: "04", who: "@anton",      score: "377.5", lift: "Total · kg" },
  { rank: "05", who: "@frederik",   score: "340.0", lift: "Total · kg" },
];

export default async function CrewPage() {
  // In connected mode: fetch real feed. Empty array = no posts yet (show empty state).
  // In demo mode: getFeedPosts returns null → render mock feed.
  const realFeed = await getFeedPosts(30);
  const useReal = SUPABASE_ENABLED && realFeed !== null;
  const feed = useReal ? realFeed : MOCK_FEED;
  const isEmpty = useReal && feed.length === 0;

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
          <span className="text-xs font-mono text-fg-faint">
            {useReal ? `${feed.length} posts` : "Senest opdateret · nu"}
          </span>
        </div>

        {isEmpty ? (
          <div className="surface-2 rounded-2xl p-8 text-center">
            <div className="font-display text-2xl mb-2">Crewet er stille.</div>
            <p className="text-fg-dim text-sm mb-4 max-w-sm mx-auto">
              Vær den første til at dele en PR, en note eller et form-check. De andre kommer.
            </p>
            <PostComposer
              trigger={
                <button type="button" className="btn btn-primary btn-sm">+ Del</button>
              }
            />
          </div>
        ) : (
          <ul className="space-y-3">
            {feed.map((p) => (
              <li key={p.id}>
                <PostCard post={p} />
              </li>
            ))}
          </ul>
        )}
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
