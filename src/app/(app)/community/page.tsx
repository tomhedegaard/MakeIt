import { getLocale, getTranslations } from "next-intl/server";
import { intlLocaleTag } from "@/i18n/config";
import { capitalize, demoCalendar, meetLabel, monthName } from "@/lib/dates/demo-calendar";
import Container from "@/components/Container";
import PageTitle from "@/components/ui/PageTitle";
import SectionHeader from "@/components/ui/SectionHeader";
import PostComposer from "@/components/community/PostComposer";
import PostCard from "@/components/community/PostCard";
import RealtimeIndicator from "@/components/community/RealtimeIndicator";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getFeedPosts, type FeedPost } from "@/lib/data/community";
import { communityChallengeProgress } from "@/lib/community/challenge-progress";
import Avatar from "@/components/ui/Avatar";
import Progress from "@/components/ui/Progress";
import { cn, formatNumber } from "@/lib/utils";

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
    content: "Ny DL PR: 175 kg @ 68 kg BW. Brugte sorte StrapIts, hænderne overlevede.",
    tag: "PR", isPr: true, whenLabel: "2 min",
    reactionsCount: 84, commentsCount: 12, reactedByMe: false,
  },
  {
    id: "m2", who: "@kasper_s", tier: "Athlete",
    content: "Afsluttet uge 8 af PR-Block. Squat top single 162,5 kg, sad let.",
    tag: null, isPr: false, whenLabel: "1t",
    reactionsCount: 41, commentsCount: 5, reactedByMe: false,
  },
  {
    id: "m3", who: "@maria.lift", tier: "Beast",
    content: "Form-check video uploadet: bench-pause med 90 kg. Tager gerne kommentarer.",
    tag: "Form-check", isPr: false, formcheck: true, whenLabel: "3t",
    reactionsCount: 28, commentsCount: 8, reactedByMe: false,
  },
  {
    id: "m4", who: "@Munk", tier: "Legend",
    content: "Ny limited cuff-farve på fredag, kun for crewet. Olive er tilbage.",
    tag: null, isPr: false, whenLabel: "5t",
    reactionsCount: 122, commentsCount: 31, reactedByMe: false,
  },
  {
    id: "m5", who: "@frederik", tier: "Lifter",
    content: "Første dag i opbygningsfasen. 4 sæt squat. Kan allerede mærke det.",
    tag: null, isPr: false, whenLabel: "8t",
    reactionsCount: 12, commentsCount: 3, reactedByMe: false,
  },
];

const LEADERBOARD = [
  { rank: "01", who: "@nina_dl",    score: 412.5, lift: "Total · kg" },
  { rank: "02", who: "@kasper_s",   score: 405,   lift: "Total · kg" },
  { rank: "03", who: "@maria.lift", score: 382.5, lift: "Total · kg" },
  { rank: "04", who: "@Munk",      score: 377.5, lift: "Total · kg" },
  { rank: "05", who: "@frederik",   score: 340,   lift: "Total · kg" },
];

export default async function CrewPage() {
  const t = await getTranslations("Community.page");
  const tag = intlLocaleTag(await getLocale());
  const cal = demoCalendar();
  const month = monthName(cal.month, tag);

  // In connected mode: fetch real feed. Empty array = no posts yet (show empty state).
  // In demo mode: getFeedPosts returns null → render mock feed.
  const realFeed = await getFeedPosts(30);
  const useReal = SUPABASE_ENABLED && realFeed !== null;
  const feed = useReal ? realFeed : MOCK_FEED;
  const isEmpty = useReal && feed.length === 0;
  const challenge = communityChallengeProgress(useReal ? "connected" : "demo");
  const challengeLabel = `${formatNumber(challenge.currentK, tag)} / 100K`;

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <RealtimeIndicator />
      {/* Header + post composer */}
      <div className="pt-2">
        <PageTitle
          kicker={t("eyebrow")}
          title={t("title")}
          action={
            <PostComposer
              trigger={
                <button
                  type="button"
                  className="btn btn-sm"
                  aria-label={t("shareAria")}
                >
                  {t("shareButton")}
                </button>
              }
            />
          }
        />
      </div>

      {/* Story strip — demo only. Connected members see an
          honest empty line until we have a real trained-today query. */}
      {!useReal ? (
      <section
        aria-label={t("storiesAria")}
        className="-mx-5 md:mx-0 px-5 md:px-0 overflow-x-auto"
      >
        <ol className="flex gap-3 md:gap-4 min-w-max md:flex-wrap md:min-w-0">
          {STORIES.map((s) => (
            <li key={s.who} className="shrink-0 text-center">
              {/* 1 px ring: ink when they trained today, a line when resting. */}
              <span
                className={cn(
                  "mx-auto mb-2 flex size-14 md:size-16 items-center justify-center rounded-full border",
                  s.trained ? "border-fg" : "border-line",
                )}
              >
                <Avatar handle={s.who} className="size-12 md:size-14 border-0 bg-bg-2" />
              </span>
              <div className="text-micro text-fg-dim">{s.who.replace("@", "")}</div>
              <div className="text-micro text-fg-faint">
                {s.trained ? t("trained") : t("resting")}
              </div>
            </li>
          ))}
        </ol>
      </section>
      ) : (
      <p className="text-xs text-fg-faint">
        {t("storiesEmpty")}
      </p>
      )}

      {/* Monthly challenge hero — demo only. Fail-closed on connected
          env (not feed-null), so a new member never sees May as live. */}
      {!SUPABASE_ENABLED ? (
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="eyebrow">
              {t("challengeEyebrow", { month: capitalize(month), days: cal.daysLeft })}
            </div>
            <span className="numeric text-xs text-fg-dim">
              {t("challengeParticipants", { count: challenge.participantCount })}
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-3">
            {t("challengeTitle")}
          </h2>
          <p className="text-fg-dim text-sm">
            {t("challengeDescription", { month })}
          </p>
        </div>
        <div className="px-5 pb-3">
          <div className="flex items-baseline justify-between mb-2">
            <span className="numeric text-2xl">{challengeLabel}</span>
            <span className="text-xs text-fg-dim">
              {t("challengeProgress", { pct: challenge.youPercent })}
            </span>
          </div>
          <Progress
            value={challenge.barPercent}
            label={t("challengeTitle")}
            valueText={challengeLabel}
          />
        </div>
        {/* Facts, not controls: nothing to press until enrolment is real. */}
        <dl className="border-t hairline grid grid-cols-2">
          <div className="px-5 py-4 border-r hairline">
            <dt className="eyebrow mb-1">{t("challengeRewardLabel")}</dt>
            <dd className="text-sm">{t("challengeRewardValue")}</dd>
          </div>
          <div className="px-5 py-4">
            <dt className="eyebrow mb-1">{t("challengeStatusLabel")}</dt>
            <dd className="text-sm">
              {challenge.enrolled
                ? t("challengeStatusValue")
                : t("challengeStatusEmpty")}
            </dd>
          </div>
        </dl>
      </section>
      ) : (
      <section className="surface-2 rounded-2xl overflow-hidden px-5 py-6">
        <SectionHeader eyebrow={t("challengeEmptyEyebrow")} title={t("challengeEmptyTitle")} />
        <p className="text-fg-dim text-sm max-w-md">{t("challengeEmptyBody")}</p>
      </section>
      )}

      {/* Feed */}
      <section>
        <div className="flex items-end justify-between mb-3">
          <h2 className="eyebrow">{t("feedEyebrow")}</h2>
          <span className="text-xs text-fg-faint">
            {useReal
              ? t("feedCount", { count: feed.length })
              : t("feedUpdated")}
          </span>
        </div>

        {isEmpty ? (
          <div className="surface-2 rounded-2xl p-8">
            <div className="font-display text-2xl mb-2">{t("emptyTitle")}</div>
            <p className="text-fg-dim text-sm mb-4 max-w-sm">
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

      {/* Leaderboard — demo only. Invented totals stay in demo;
          connected members see an honest empty line. */}
      {!useReal ? (
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b hairline flex items-center justify-between">
          <SectionHeader
            className="mb-0"
            eyebrow={t("leaderboardEyebrow")}
            title={t("leaderboardTitle")}
          />
          <span className="eyebrow">
            {t("leaderboardMonth", { month: capitalize(month), year: cal.month.getFullYear() })}
          </span>
        </div>
        <ul className="divide-y hairline">
          {LEADERBOARD.map((row) => (
            <li key={row.rank} className="px-5 py-3 flex items-center gap-4 text-sm">
              <span className="numeric text-fg-faint w-7">{row.rank}</span>
              <Avatar handle={row.who} className="size-8" />
              <span className="flex-1 truncate">{row.who}</span>
              <span className="numeric text-fg-body">{formatNumber(row.score, tag)}</span>
              <span className="text-micro text-fg-faint hidden sm:inline">{row.lift}</span>
            </li>
          ))}
        </ul>
      </section>
      ) : (
      <section className="surface-2 rounded-2xl overflow-hidden px-5 py-5">
        <div className="eyebrow mb-1">{t("leaderboardEyebrow")}</div>
        <p className="text-sm text-fg-dim">{t("leaderboardEmpty")}</p>
      </section>
      )}

      {/* IRL meet — demo fixture only. Connected members get an honest
          empty, not 24/05 Open House as a live event. */}
      {!SUPABASE_ENABLED ? (
      <section className="surface-2 rounded-2xl p-5">
        <SectionHeader className="mb-1" eyebrow={t("meetEyebrow")} title={t("meetTitle")} />
        <p className="text-sm text-fg-dim">
          {t("meetDescription", { date: meetLabel(cal.meet, tag) })}
        </p>
      </section>
      ) : (
      <section className="surface-2 rounded-2xl p-5">
        <SectionHeader className="mb-1" eyebrow={t("meetEmptyEyebrow")} title={t("meetEmptyTitle")} />
        <p className="text-sm text-fg-dim">
          {t("meetEmptyBody")}
        </p>
      </section>
      )}
    </Container>
  );
}
