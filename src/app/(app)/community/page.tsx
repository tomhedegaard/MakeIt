import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PostComposer from "@/components/community/PostComposer";
import PostCard from "@/components/community/PostCard";
import RealtimeIndicator from "@/components/community/RealtimeIndicator";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getFeedPosts, type FeedPost } from "@/lib/data/community";
import { communityChallengeProgress } from "@/lib/community/challenge-progress";

const STORIES = [
  { who: "@Munk",      tier: "Legend",  trained: true },
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
    id: "m4", who: "@Munk", tier: "Legend",
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
  { rank: "04", who: "@Munk",      score: "377.5", lift: "Total · kg" },
  { rank: "05", who: "@frederik",   score: "340.0", lift: "Total · kg" },
];

export default async function CrewPage() {
  const t = await getTranslations("Community.page");

  // In connected mode: fetch real feed. Empty array = no posts yet (show empty state).
  // In demo mode: getFeedPosts returns null → render mock feed.
  const realFeed = await getFeedPosts(30);
  const useReal = SUPABASE_ENABLED && realFeed !== null;
  const feed = useReal ? realFeed : MOCK_FEED;
  const isEmpty = useReal && feed.length === 0;
  const challenge = communityChallengeProgress(useReal ? "connected" : "demo");

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <RealtimeIndicator />
      {/* Header + post composer */}
      <header className="flex items-end justify-between gap-4 pt-2">
        <div>
          <div className="eyebrow mb-2">{t("eyebrow")}</div>
          <h1 className="font-display text-[clamp(2.4rem,8vw,4rem)] leading-[0.92]">
            {t("title")}
          </h1>
        </div>
        <PostComposer
          trigger={
            <button
              type="button"
              className="btn btn-primary btn-sm"
              aria-label={t("shareAria")}
            >
              {t("shareButton")}
            </button>
          }
        />
      </header>

      {/* Story strip — demo only. Connected has no live "trained today" feed. */}
      {!useReal ? (
      <section
        aria-label={t("storiesAria")}
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
                {s.trained ? t("trained") : t("resting")}
              </div>
            </li>
          ))}
        </ol>
      </section>
      ) : null}

      {/* Monthly challenge hero */}
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">{t("challengeEyebrow")}</div>
            <span className="numeric text-xs text-fg-dim">
              {t("challengeParticipants", { count: challenge.participantCount })}
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-3">
            {t("challengeTitle")}
          </h2>
          <p className="text-fg-dim text-sm">
            {t("challengeDescription")}
          </p>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="numeric text-2xl">{challenge.currentLabel}</span>
            <span className="text-xs font-mono text-fg-dim">
              {t("challengeProgress", { pct: challenge.youPercent })}
            </span>
          </div>
          <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
            <div
              className="h-full bg-fg"
              style={{ width: `${challenge.barPercent}%` }}
              data-challenge-bar=""
            />
          </div>
        </div>
        <div className="border-t hairline grid grid-cols-2">
          <button type="button" className="px-5 py-4 text-left hover:bg-bg-3 border-r hairline">
            <div className="eyebrow mb-1">{t("challengeRewardLabel")}</div>
            <div className="text-sm">{t("challengeRewardValue")}</div>
          </button>
          <button type="button" className="px-5 py-4 text-left hover:bg-bg-3">
            <div className="eyebrow mb-1">{t("challengeStatusLabel")}</div>
            <div className="text-sm">
              {challenge.enrolled
                ? t("challengeStatusValue")
                : t("challengeStatusEmpty")}
            </div>
          </button>
        </div>
      </section>

      {/* Feed */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <div className="eyebrow">{t("feedEyebrow")}</div>
          <span className="text-xs font-mono text-fg-faint">
            {useReal
              ? t("feedCount", { count: feed.length })
              : t("feedUpdated")}
          </span>
        </div>

        {isEmpty ? (
          <div className="surface-2 rounded-2xl p-8 text-center">
            <div className="font-display text-2xl mb-2">{t("emptyTitle")}</div>
            <p className="text-fg-dim text-sm mb-4 max-w-sm mx-auto">
              {t("emptyBody")}
            </p>
            <PostComposer
              trigger={
                <button type="button" className="btn btn-primary btn-sm">
                  {t("shareButton")}
                </button>
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

      {/* Leaderboard — demo only. No live aggregate in connected mode. */}
      {!useReal ? (
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b hairline flex items-center justify-between">
          <div>
            <div className="eyebrow mb-1">{t("leaderboardEyebrow")}</div>
            <div className="font-display text-2xl">{t("leaderboardTitle")}</div>
          </div>
          <span className="eyebrow">{t("leaderboardMonth")}</span>
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
      ) : null}

      {/* IRL meet */}
      <section className="surface-2 rounded-2xl p-5">
        <div className="eyebrow mb-2">{t("meetEyebrow")}</div>
        <div className="font-display text-2xl mb-1">{t("meetTitle")}</div>
        <p className="text-sm text-fg-dim mb-4">
          {t("meetDescription")}
        </p>
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary btn-sm flex-1">
            {t("meetRsvp")}
          </button>
          <button type="button" className="btn btn-sm">{t("meetReadMore")}</button>
        </div>
      </section>
    </Container>
  );
}
