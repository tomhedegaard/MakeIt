import { getLocale, getTranslations } from "next-intl/server";
import { intlLocaleTag } from "@/i18n/config";
import { dayMonth, demoCalendar } from "@/lib/dates/demo-calendar";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import Progress from "@/components/ui/Progress";
import { ICON } from "@/components/ui/icon";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import {
  getRecentRepsTransactions,
  getRewardCatalog,
  getMyRedemptions,
  getRepsBalance,
  type Reward,
} from "@/lib/data/rewards";
import {
  relativeAgoBucket,
  repsReasonMessageKey,
} from "@/lib/i18n/member-bodycopy";
import RedeemButton from "./RedeemButton";

type RepsT = Awaited<ReturnType<typeof getTranslations<"Reps">>>;

const MOCK_REWARD_SLUGS = [
  "limited-cuff-olive",
  "1on1-formcheck",
  "custom-broderet-strap",
  "open-house-vip",
] as const;

function localizeReward(r: Reward, t: RepsT, meetDate: string): Reward {
  if (!(MOCK_REWARD_SLUGS as readonly string[]).includes(r.slug)) return r;
  return {
    ...r,
    name: t(`shop.mock.${r.slug}.name`),
    description: t(`shop.mock.${r.slug}.description`, { date: meetDate }),
  };
}

const DEMO_REWARD_NAME_SLUG: Record<string, (typeof MOCK_REWARD_SLUGS)[number]> = {
  "Limited Cuff · Olive": "limited-cuff-olive",
  // Legacy name still stored on older redemption rows.
  "Limited Cuff — Olive": "limited-cuff-olive",
  "1:1 Form-check med Mikael": "1on1-formcheck",
  "Custom-broderet strap": "custom-broderet-strap",
  "Broderet StrapIt": "custom-broderet-strap",
  "Open House VIP-pakke": "open-house-vip",
};

function localizeRewardName(name: string, t: RepsT): string {
  const slug = DEMO_REWARD_NAME_SLUG[name];
  return slug ? t(`shop.mock.${slug}.name`) : name;
}

/** Categorize a reference_type for icon + accent. */
function txCategory(refType: string | null): "mental" | "coaching" | "training" {
  if (!refType) return "training";
  if (
    refType === "mind_check_streak" ||
    refType === "mental_session_completed" ||
    refType === "journal_entry" ||
    refType === "mental_buddy_interaction" ||
    refType === "cirkel_participation" ||
    refType === "mental_milestone_30d" ||
    refType === "mental_milestone_90d"
  ) {
    return "mental";
  }
  if (
    refType === "lesson_completed" ||
    refType === "coach_review_sandbox" ||
    refType === "co_coach_promotion" ||
    refType === "buddy_interaction_streak"
  ) {
    return "coaching";
  }
  return "training";
}

const TIER_NAMES = ["Lifter", "Athlete", "Beast", "Legend"] as const;
const HOW_KEYS = ["buy", "week", "pr", "invite", "challenge", "expiry"] as const;
const KIND_KEYS = ["drop", "experience", "physical", "digital"] as const;

const TIER_THRESHOLDS = [
  { name: "Lifter",  min: 0 },
  { name: "Athlete", min: 1000 },
  { name: "Beast",   min: 5000 },
  { name: "Legend",  min: 15000 },
] as const;

function tierProgress(balance: number) {
  const current = [...TIER_THRESHOLDS].reverse().find((t) => balance >= t.min)!;
  const next = TIER_THRESHOLDS.find((t) => t.min > balance);
  if (!next) {
    return { current: current.name, next: null, toNext: null, pct: 100 };
  }
  const span = next.min - current.min;
  const got = balance - current.min;
  return {
    current: current.name,
    next: next.name,
    toNext: next.min - balance,
    pct: Math.round((got / span) * 100),
  };
}

export default async function RepsPage() {
  const member = (await getSession())!;
  const locale = await getLocale();
  const tag = intlLocaleTag(locale);
  const t = await getTranslations("Reps");

  const [rewardsRaw, redemptions, balance, transactions] = await Promise.all([
    getRewardCatalog(),
    getMyRedemptions(member.id, 10),
    getRepsBalance(member.id),
    getRecentRepsTransactions(member.id, 20),
  ]);
  const meetDate = dayMonth(demoCalendar().meet);
  const rewards = rewardsRaw.map((r) => localizeReward(r, t, meetDate));
  const progress = tierProgress(balance);

  const tiers = TIER_NAMES.map((name) => ({
    name,
    range: t(`tiers.list.${name}.range`),
    perks: t.raw(`tiers.list.${name}.perks`) as string[],
  }));
  const how = HOW_KEYS.map((key) => ({
    v: t(`how.list.${key}.v`),
    k: t(`how.list.${key}.k`),
    sub: t(`how.list.${key}.sub`),
  }));
  const kindLabels: Record<string, string> = Object.fromEntries(
    KIND_KEYS.map((key) => [key, t(`kindLabels.${key}`)]),
  );

  return (
    <>
      <PageHeader
        eyebrow={t("header.eyebrow")}
        title={t("header.title")}
        subtitle={t("header.subtitle")}
        right={
          // Nord §6.7: saldoen er hero-tallet, venstrestillet, med
          // niveau og afstand til næste niveau under og progress i mos.
          <div className="min-w-[220px]">
            <div className="eyebrow mb-2">{t("balance.label")}</div>
            <div className="numeric text-hero md:text-hero-lg">
              {balance.toLocaleString(tag)}
            </div>
            <div className="text-meta text-fg-dim mt-2">
              {t("balance.tier", { tier: progress.current })}
            </div>
            {progress.next ? (
              <>
                <Progress
                  className="mt-3"
                  value={progress.pct}
                  label={t("balance.progressLabel", { tier: progress.next })}
                  valueText={t("balance.toNext", {
                    amount: progress.toNext?.toLocaleString(tag) ?? "",
                    tier: progress.next,
                  })}
                />
                <div className="text-meta text-fg-dim mt-2">
                  {t("balance.toNext", {
                    amount: progress.toNext?.toLocaleString(tag) ?? "",
                    tier: progress.next,
                  })}
                </div>
              </>
            ) : (
              <div className="text-micro text-fg-faint mt-3">
                {t("balance.topCap")}
              </div>
            )}
          </div>
        }
      />

      <Container className="py-8 md:py-12 space-y-10 md:space-y-14">
        {/* Nord §6.7: the four tiers as one horizontal scale. Perks sit
            in a disclosure so the scale stays a glance, not a wall. */}
        <section aria-labelledby="reps-tiers">
          <h2 id="reps-tiers" className="font-display text-section mb-4">{t("tiers.eyebrow")}</h2>
          <ol className="grid grid-cols-4 border-t hairline">
            {tiers.map((tier) => {
              const active = tier.name === progress.current;
              return (
                <li
                  key={tier.name}
                  aria-current={active ? "step" : undefined}
                  className="relative min-w-0 pt-3 pr-2"
                >
                  {active ? (
                    <span aria-hidden="true" className="absolute -top-px left-0 right-2 h-0.5 bg-signal" />
                  ) : null}
                  <div className={active ? "text-meta md:text-copy text-fg" : "text-meta md:text-copy text-fg-dim"}>
                    {tier.name}
                  </div>
                  <div className="numeric text-micro text-fg-faint mt-0.5">
                    {tier.range}
                  </div>
                  {active ? (
                    <div className="text-micro text-fg-dim mt-1">{t("tiers.you")}</div>
                  ) : null}
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-meta text-fg-dim">{t("tiers.coachSchool")}</p>
          <details className="mt-4 border-t border-b hairline group">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between text-copy list-none [&::-webkit-details-marker]:hidden">
              {t("tiers.perksToggle")}
              <Plus {...ICON} className="size-4 text-fg-dim transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none" />
            </summary>
            <dl className="grid gap-x-8 gap-y-5 pb-5 pt-1 sm:grid-cols-2 lg:grid-cols-4">
              {tiers.map((tier) => (
                <div key={tier.name}>
                  <dt className="text-meta text-fg">{tier.name}</dt>
                  <dd>
                    <ul className="mt-1 space-y-1 text-copy text-fg-body">
                      {tier.perks.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-section">{t("transactions.eyebrow")}</h2>
            <span className="text-micro text-fg-dim">
              {t("transactions.count", { count: transactions.length })}
            </span>
          </div>
          {transactions.length === 0 ? (
            <p className="text-fg-dim text-meta">
              {t("transactions.empty")}
            </p>
          ) : (
            <ul className="divide-y divide-line border hairline rounded-lg overflow-hidden">
              {transactions.map((tx) => {
                const cat = txCategory(tx.reference_type);
                const reasonKey = repsReasonMessageKey(tx.reference_type);
                const ago = relativeAgoBucket(tx.created_at);
                // Domain hues: mental → mind, training → body.
                // Coach-school stays monochrome (no domain color in v1).
                const dot =
                  cat === "mental"
                    ? "bg-mind"
                    : cat === "coaching"
                      ? "bg-fg/50"
                      : "bg-body";
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 px-4 py-3 bg-bg-2/30"
                  >
                    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    {/* Title on its own line, category and time under it:
                        four columns broke titles over three lines at 375 px. */}
                    <span className="flex-1 min-w-0">
                      <span className="block text-copy">
                        {reasonKey ? t(reasonKey) : tx.reason}
                      </span>
                      <span className="block text-micro text-fg-faint mt-0.5">
                        {t(`categories.${cat}`)} · {t(`relativeTime.${ago.key}`, { count: ago.count })}
                      </span>
                    </span>
                    <span
                      className={`numeric text-copy tabular-nums shrink-0 w-14 text-right ${
                        tx.delta > 0 ? "text-fg" : "text-fg-dim"
                      }`}
                    >
                      {tx.delta > 0 ? "+" : ""}
                      {tx.delta.toLocaleString(tag)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="reps-how">
          <h2 id="reps-how" className="font-display text-section mb-4">{t("how.eyebrow")}</h2>
          <ul className="border-t hairline md:grid md:grid-cols-2 md:gap-x-10">
            {how.map((row) => (
              <li key={row.k} className="flex items-baseline gap-4 py-3 border-b hairline">
                <span className="numeric w-16 shrink-0 text-right text-card text-fg">{row.v}</span>
                <span className="min-w-0">
                  <span className="block text-copy text-fg-body">{row.k}</span>
                  <span className="block text-meta text-fg-faint mt-0.5">{row.sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-section">{t("shop.eyebrow")}</h2>
            <span className="numeric text-micro text-fg-dim">
              {t("shop.balance", { balance: balance.toLocaleString(tag) })}
            </span>
          </div>
          {rewards.length === 0 ? (
            <div className="surface-2 rounded-lg p-6 text-meta text-fg-dim">
              {t("shop.empty")}
            </div>
          ) : (
            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {rewards.map((r) => (
                <article key={r.id} className="surface-2 rounded-lg p-5 md:p-6 lift flex flex-col">
                  <div className="numeric text-title mb-1">
                    {r.costReps.toLocaleString(tag)}
                  </div>
                  <div className="eyebrow mb-3">{t("shop.repsLabel")}</div>
                  <div className="font-display text-card mb-1">{r.name}</div>
                  {r.description ? (
                    <p className="text-meta text-fg-dim mb-3 flex-1">
                      {r.description}
                    </p>
                  ) : <div className="flex-1" />}
                  <div className="flex items-center justify-between text-micro text-fg-faint">
                    <span>{kindLabels[r.kind] ?? r.kind}</span>
                    {r.stock !== null ? (
                      <span>{t("shop.stockLeft", { stock: r.stock })}</span>
                    ) : (
                      <span>{t("shop.unlimited")}</span>
                    )}
                  </div>
                  <RedeemButton reward={r} balance={balance} />
                </article>
              ))}
            </div>
          )}
        </section>

        {redemptions.length > 0 ? (
          <section>
            <div className="flex items-end justify-between mb-3">
              <h2 className="font-display text-section">{t("redemptions.eyebrow")}</h2>
              <span className="text-micro text-fg-faint">
                {t("redemptions.total", { count: redemptions.length })}
              </span>
            </div>
            <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
              {redemptions.map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-center gap-4 text-copy">
                  <span className="numeric text-micro text-fg-faint w-20 shrink-0">
                    {new Date(r.redeemedAt).toLocaleDateString(tag, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="flex-1 truncate">{localizeRewardName(r.rewardName, t)}</span>
                  <span className="numeric text-fg-dim text-micro shrink-0">
                    − {r.costReps.toLocaleString(tag)}
                  </span>
                  <span
                    className="text-micro border hairline-strong px-2 py-0.5 shrink-0"
                    style={{
                      color:
                        r.status === "fulfilled" || r.status === "shipped"
                          ? "var(--fg)"
                          : r.status === "cancelled"
                            ? "var(--fg-faint)"
                            : "var(--fg-dim)",
                    }}
                  >
                    {t(`status.${r.status}`)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}
