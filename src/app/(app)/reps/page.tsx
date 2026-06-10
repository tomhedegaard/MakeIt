import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getRecentRepsTransactions,
  getRewardCatalog,
  getMyRedemptions,
  getRepsBalance,
  statusLabel,
} from "@/lib/data/rewards";
import RedeemButton from "./RedeemButton";

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

const CATEGORY_LABEL: Record<"mental" | "coaching" | "training", string> = {
  mental: "Mental",
  coaching: "Coaching",
  training: "Træning",
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${Math.max(1, m)} min siden`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} t siden`;
  const d = Math.floor(h / 24);
  return `${d} dage siden`;
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

  const [rewards, redemptions, balance, transactions] = await Promise.all([
    getRewardCatalog(),
    getMyRedemptions(member.id, 10),
    getRepsBalance(member.id),
    getRecentRepsTransactions(member.id, 20),
  ]);
  const progress = tierProgress(balance);

  const t = await getTranslations("Reps");

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
          <div className="surface-2 rounded-lg px-6 py-4 text-right min-w-[220px]">
            <div className="eyebrow mb-1">{t("balance.label")}</div>
            <div className="numeric text-4xl">
              {balance.toLocaleString("da-DK")}
            </div>
            <div className="text-xs text-fg-faint font-mono mt-1">
              {t("balance.tier", { tier: progress.current })}
            </div>
            {progress.next ? (
              <>
                <div className="mt-3 h-1 bg-bg-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fg"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-2">
                  {t("balance.toNext", {
                    amount: progress.toNext?.toLocaleString("da-DK") ?? "",
                    tier: progress.next,
                  })}
                </div>
              </>
            ) : (
              <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-3">
                {t("balance.topCap")}
              </div>
            )}
          </div>
        }
      />

      <Container className="py-12 space-y-14">
        <section>
          <div className="eyebrow mb-6">{t("tiers.eyebrow")}</div>
          <div className="grid gap-px bg-line border hairline md:grid-cols-4">
            {tiers.map((tier) => {
              const active = tier.name === progress.current;
              return (
                <div
                  key={tier.name}
                  className="p-6 transition-colors"
                  style={{
                    background: active ? "var(--bg-3)" : "var(--bg)",
                    borderColor: active ? "var(--line-bright)" : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-display text-2xl">{tier.name}</div>
                    {active ? (
                      <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 inline-flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-fg" />
                        {t("tiers.you")}
                      </span>
                    ) : null}
                  </div>
                  <div className="numeric text-xs text-fg-dim mb-4">
                    {t("tiers.range", { range: tier.range })}
                  </div>
                  <ul className="space-y-2 text-sm text-fg/85">
                    {tier.perks.map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="text-fg-faint">·</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <div className="eyebrow">Seneste Reps</div>
            <span className="text-xs text-fg-dim font-mono uppercase tracking-[0.14em]">
              Sidste {transactions.length}
            </span>
          </div>
          {transactions.length === 0 ? (
            <p className="text-fg-dim text-sm">
              Endnu ingen Reps registreret. Træn, tjek mind-check eller skriv journal.
            </p>
          ) : (
            <ul className="divide-y divide-line border hairline rounded-lg overflow-hidden">
              {transactions.map((tx) => {
                const cat = txCategory(tx.reference_type);
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
                    <span className="text-xs uppercase tracking-wide text-fg-faint font-mono w-16 shrink-0">
                      {CATEGORY_LABEL[cat]}
                    </span>
                    <span className="flex-1 text-sm">{tx.reason}</span>
                    <span className="text-xs text-fg-dim shrink-0">
                      {formatRelative(tx.created_at)}
                    </span>
                    <span
                      className={`numeric text-sm tabular-nums shrink-0 w-14 text-right ${
                        tx.delta > 0 ? "text-fg" : "text-fg-dim"
                      }`}
                    >
                      {tx.delta > 0 ? "+" : ""}
                      {tx.delta}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className="eyebrow mb-6">{t("how.eyebrow")}</div>
          <div className="grid gap-px bg-line border hairline md:grid-cols-3">
            {how.map((row) => (
              <div key={row.k} className="bg-bg p-6">
                <div className="numeric text-3xl text-fg mb-2">{row.v}</div>
                <div className="text-fg/90 text-sm">{row.k}</div>
                <div className="text-xs text-fg-faint font-mono mt-1">{row.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <div className="eyebrow">{t("shop.eyebrow")}</div>
            <span className="numeric text-xs text-fg-dim">
              {t("shop.balance", { balance: balance.toLocaleString("da-DK") })}
            </span>
          </div>
          {rewards.length === 0 ? (
            <div className="surface-2 rounded-lg p-6 text-sm text-fg-dim">
              {t("shop.empty")}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {rewards.map((r) => (
                <article key={r.id} className="surface-2 rounded-lg p-6 lift flex flex-col">
                  <div className="numeric text-3xl mb-1">
                    {r.costReps.toLocaleString("da-DK")}
                  </div>
                  <div className="eyebrow mb-3">{t("shop.repsLabel")}</div>
                  <div className="font-display text-lg mb-1">{r.name}</div>
                  {r.description ? (
                    <p className="text-xs text-fg-dim font-mono mb-3 flex-1">
                      {r.description}
                    </p>
                  ) : <div className="flex-1" />}
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
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
              <div className="eyebrow">{t("redemptions.eyebrow")}</div>
              <span className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">
                {t("redemptions.total", { count: redemptions.length })}
              </span>
            </div>
            <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
              {redemptions.map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                  <span className="numeric text-xs text-fg-faint w-20 shrink-0">
                    {new Date(r.redeemedAt).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="flex-1 truncate">{r.rewardName}</span>
                  <span className="numeric text-fg-dim text-xs shrink-0">
                    − {r.costReps.toLocaleString("da-DK")}
                  </span>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.14em] border hairline-strong rounded-full px-2 py-0.5 shrink-0"
                    style={{
                      color:
                        r.status === "fulfilled" || r.status === "shipped"
                          ? "var(--fg)"
                          : r.status === "cancelled"
                            ? "var(--fg-faint)"
                            : "var(--fg-dim)",
                    }}
                  >
                    {statusLabel(r.status)}
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
