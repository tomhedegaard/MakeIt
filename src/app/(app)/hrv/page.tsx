import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { mockListReadings } from "@/lib/hrv/mock";
import { getTodayLifestyleLogs, getHrvSyncProgress, getHrvReadingSeries } from "@/lib/data/hrv";
import {
  getAdaptiveConsentEligibility,
  getRecentAdaptations,
} from "@/lib/data/adaptive";
import AdaptiveConsentCard from "@/components/adaptive/AdaptiveConsentCard";
import AdaptationHistory from "@/components/adaptive/AdaptationHistory";
import type { ReadinessBucket, WarmUpState } from "@/lib/hrv/types";
import HrvSubNav from "@/components/hrv/HrvSubNav";
import SectionHeader from "@/components/ui/SectionHeader";
import ReadinessLadder from "@/components/hrv/ReadinessLadder";
import HrvBandHero from "@/components/hrv/HrvBandHero";
import LifestyleLogCard from "@/components/hrv/LifestyleLogCard";
import { buildHrvBandView } from "@/lib/hrv/band";
import { demoSteadySeries } from "@/lib/hrv/demo-series";
import { loadHrvBandCopy } from "@/lib/ui/sprint-a-copy";
import { HrvSyncStreakLine } from "@/components/hrv/HrvSyncStreakLine";
import { HrvMilestoneToast } from "@/components/hrv/HrvMilestoneToast";
import { HrvWelcomeBonusToast } from "@/components/hrv/HrvWelcomeBonusToast";
import ConnectButton from "./ConnectButton";

/**
 * `/hrv` — the daily HRV destination.
 *
 * Connection-aware: resolves the current member's wearable connection and
 * latest synced reading, then renders ONE of three states:
 *  - A: no active connection → editorial intro + connect CTA
 *  - B: connected, warming up → latest RMSSD + baseline countdown
 *  - C: connected, active → RMSSD + 7d mean + readiness label
 * A needs-reauth banner renders above whichever state applies when the
 * connection's status is `needs_reauth`.
 *
 * Demo mode (`!SUPABASE_ENABLED`) has no connection table, so it always
 * renders State A.
 */

type PageT = Awaited<ReturnType<typeof getTranslations<"Hrv.page">>>;

type LatestReading = {
  rmssdMs: number;
  rolling7dMeanLnRmssd: number | null;
  warmUpState: WarmUpState;
  readinessBucket: ReadinessBucket | null;
};

type HrvState = {
  connected: boolean;
  needsReauth: boolean;
  provider: string | null;
  readingCount: number;
  latest: LatestReading | null;
};

/** Resolves the member's HRV connection + latest reading from Supabase. */
async function resolveConnectedState(memberId: string): Promise<HrvState> {
  const supabase = await createClient();
  if (!supabase) {
    return {
      connected: false,
      needsReauth: false,
      provider: null,
      readingCount: 0,
      latest: null,
    };
  }

  const { data: connection } = await supabase
    .from("hrv_wearable_connections")
    .select("provider, status")
    .eq("member_id", memberId)
    .in("status", ["active", "needs_reauth"])
    .order("last_synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!connection) {
    return {
      connected: false,
      needsReauth: false,
      provider: null,
      readingCount: 0,
      latest: null,
    };
  }

  const [{ count }, { data: latestRow }] = await Promise.all([
    supabase
      .from("hrv_readings")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId),
    supabase
      .from("hrv_readings")
      .select(
        "rmssd_ms, rolling_7d_mean_lnrmssd, warm_up_state, readiness_bucket",
      )
      .eq("member_id", memberId)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const latest: LatestReading | null = latestRow
    ? {
        rmssdMs: latestRow.rmssd_ms as number,
        rolling7dMeanLnRmssd:
          (latestRow.rolling_7d_mean_lnrmssd as number | null) ?? null,
        warmUpState: latestRow.warm_up_state as WarmUpState,
        readinessBucket:
          (latestRow.readiness_bucket as ReadinessBucket | null) ?? null,
      }
    : null;

  return {
    connected: true,
    needsReauth: connection.status === "needs_reauth",
    provider: (connection.provider as string) ?? null,
    readingCount: count ?? 0,
    latest,
  };
}

/**
 * Whether the member has cycle tracking enabled in their `hrv_settings`.
 *
 * A member may have NO `hrv_settings` row (it is created lazily the first
 * time they open HRV settings) — `.maybeSingle()` returns `null` in that
 * case, which we treat as `false`. Demo mode (no client) → `false`.
 */
async function resolveCycleTrackingEnabled(
  memberId: string,
): Promise<boolean> {
  const supabase = await createClient();
  if (!supabase) return false;

  const { data: settings } = await supabase
    .from("hrv_settings")
    .select("cycle_tracking_enabled")
    .eq("member_id", memberId)
    .maybeSingle();

  return settings?.cycle_tracking_enabled === true;
}

/** Days remaining in the baseline warm-up, clamped to >= 0. */
function daysRemaining(warmUpState: WarmUpState, count: number): number {
  const target = warmUpState === "discovery" ? 7 : 14;
  return Math.max(0, target - count);
}

/** Maps a provider id to its display name. */
function providerName(provider: string | null, t: PageT): string {
  if (provider === "whoop") return "WHOOP";
  if (provider === "oura") return "Oura";
  if (provider === "polar") return "Polar";
  return t("yourWearable");
}

export default async function HrvPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  const tPage = await getTranslations("Hrv.page");

  const series = SUPABASE_ENABLED
    ? await getHrvReadingSeries(member.id)
    : demoSteadySeries();
  const band = buildHrvBandView(series);
  const bandCopy = await loadHrvBandCopy({
    count: band.nightsCollected,
    needed: band.nightsNeeded,
  });

  const state = SUPABASE_ENABLED
    ? await resolveConnectedState(member.id)
    : ({
        connected: false,
        needsReauth: false,
        provider: null,
        // Demo mode: fixture series below drives the band hero so Munk
        // can walk Heart without a wearable. The connect wall stays
        // available for real empty members.
        readingCount: mockListReadings("demo-member").length,
        latest: null,
      } satisfies HrvState);

  const provider = providerName(state.provider, tPage);

  // Sync-streak progress (V2.5). Demo-safe: returns the zero-state when
  // Supabase is unavailable, in which case the component renders nothing.
  const progress = await getHrvSyncProgress(member.id);

  // Adaptive engine consent eligibility — gated on warmUpState='active'
  // + has active wearable + flag not yet enabled. The card renders
  // null otherwise so it's safe to include unconditionally.
  // Adaptive history — last 30 days of adaptive_v0 modifiers with
  // outcomes. Empty in demo mode; empty-state copy in component when
  // member hasn't had any adaptations yet.
  const [adaptiveConsent, adaptiveHistory] = SUPABASE_ENABLED
    ? await Promise.all([
        getAdaptiveConsentEligibility(member.id),
        getRecentAdaptations(member.id, 30),
      ])
    : [{ eligible: false, enabled: false }, []];

  // Connected states (warming-up, active, pending-first-sync) also render the
  // daily lifestyle quick-log card. The no-connection state never reaches it.
  const lifestyleCard = state.connected ? (
    <LifestyleLogCard
      initialLogs={await getTodayLifestyleLogs(member.id)}
      cycleTrackingEnabled={await resolveCycleTrackingEnabled(member.id)}
    />
  ) : null;

  return (
    <>
      <PageHeader
        eyebrow={tPage("eyebrow")}
        title={tPage("title")}
        subtitle={tPage("subtitle")}
      />
      <Container className="py-8 lg:py-12 space-y-8">
        <HrvSubNav />

        {/* V2.5 celebration toasts (spec §5.2, §5.3). HrvWelcomeBonusToast
            uses useSearchParams — wrapped in Suspense per Next 16 guidance. */}
        <Suspense fallback={null}>
          <HrvWelcomeBonusToast />
        </Suspense>
        <HrvMilestoneToast unseen={progress.unseenMilestone} />

        {/*
          Adaptive engine consent — appears once the member's baseline
          is mature and they have an active wearable, but they haven't
          opted in yet. Disappears the moment they flip the flag (or
          the connection goes inactive). No dismiss tracking for v0;
          the card is informational, not nag-y.
        */}
        <AdaptiveConsentCard eligible={adaptiveConsent.eligible} />

        {/*
          Adaptive history (OB-6) — last 30 days. Only rendered when
          the member has opted in. Pre-opt-in members see only the
          consent card above; not-yet-eligible members see neither.
          Once opted in but before the cron has produced any modifiers,
          the component renders its own "motoren starter når…" copy.
        */}
        {adaptiveConsent.enabled ? (
          <AdaptationHistory items={adaptiveHistory} />
        ) : null}

        {state.needsReauth ? (
          <div
            role="alert"
            className="surface-2 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ borderColor: "var(--line-bright)" }}
          >
            <div className="flex-1">
              <div className="eyebrow mb-1">{tPage("reauth.eyebrow")}</div>
              <p className="text-sm text-fg-dim">
                {tPage("reauth.body", { provider })}
              </p>
            </div>
            <ConnectButton label={tPage("reauth.cta")} variant="reauth" />
          </div>
        ) : null}

        {!SUPABASE_ENABLED || band.state !== "empty" ? (
          <HrvBandHero view={band} copy={bandCopy} />
        ) : !state.connected ? (
          <StateNotConnected t={tPage} />
        ) : state.latest && state.latest.warmUpState !== "active" ? (
          <StateWarmingUp
            rmssdMs={state.latest.rmssdMs}
            daysLeft={daysRemaining(
              state.latest.warmUpState,
              state.readingCount,
            )}
            provider={provider}
            t={tPage}
          />
        ) : state.latest ? (
          <StateActive latest={state.latest} provider={provider} t={tPage} />
        ) : (
          // Connected, but no readings synced yet — first sync pending.
          <StatePendingFirstSync provider={provider} t={tPage} />
        )}

        <HrvSyncStreakLine progress={progress} />

        {lifestyleCard}
      </Container>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* State A — no active wearable connection                          */
/* ---------------------------------------------------------------- */

function StateNotConnected({ t }: { t: PageT }) {
  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-7 md:px-8 md:py-10 border-b hairline">
        <SectionHeader eyebrow={t("connectEyebrow")} title={t("connectTitle")} />
        <p className="text-fg-dim text-sm md:text-base leading-relaxed max-w-xl">
          {t("connectBody")}
        </p>
      </div>

      <ol className="divide-y hairline">
        {[
          { n: "01", title: t("connectStep1Title"), d: t("connectStep1Body") },
          { n: "02", title: t("connectStep2Title"), d: t("connectStep2Body") },
          { n: "03", title: t("connectStep3Title"), d: t("connectStep3Body") },
        ].map((row) => (
          <li key={row.n} className="px-6 py-4 md:px-8 flex items-start gap-4">
            <span className="numeric text-fg-faint text-xs w-7 pt-0.5 shrink-0">
              {row.n}
            </span>
            <div className="min-w-0">
              <div className="text-fg/90 text-sm md:text-base">{row.title}</div>
              <div className="text-fg-dim text-xs md:text-sm mt-0.5 leading-relaxed">
                {row.d}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="p-5 md:p-8 space-y-4">
        <ConnectButton label={t("connectCta")} />
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
          {t("connectAppleNote")}
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* State B — connected, warming up                                  */
/* ---------------------------------------------------------------- */

function StateWarmingUp({
  rmssdMs,
  daysLeft,
  provider,
  t,
}: {
  rmssdMs: number;
  daysLeft: number;
  provider: string;
  t: PageT;
}) {
  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 md:px-8 border-b hairline flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="eyebrow">{t("warmingUp.eyebrow")}</span>
      </div>

      <div className="px-6 py-8 md:px-8 md:py-10">
        <div className="eyebrow mb-2">{t("warmingUp.latest")}</div>
        <div className="numeric text-6xl md:text-7xl leading-[0.9]">
          {Math.round(rmssdMs)}
          <span className="text-fg-dim text-2xl md:text-3xl ml-2">{t("unit")}</span>
        </div>
        <p className="text-fg-dim text-sm md:text-base mt-5 max-w-md leading-relaxed">
          {t.rich("warmingUp.body", {
            count: daysLeft,
            em: (chunks) => <span className="text-fg">{chunks}</span>,
          })}
        </p>
      </div>

      <div className="px-6 py-3 md:px-8 border-t hairline">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          {t("syncedFrom", { provider })}
        </span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* State C — connected, active                                      */
/* ---------------------------------------------------------------- */

function StateActive({
  latest,
  provider,
  t,
}: {
  latest: LatestReading;
  provider: string;
  t: PageT;
}) {
  const meanMs =
    latest.rolling7dMeanLnRmssd != null
      ? Math.round(Math.exp(latest.rolling7dMeanLnRmssd))
      : null;
  const readinessLabel = latest.readinessBucket
    ? t(`readiness.${latest.readinessBucket}`)
    : null;

  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 md:px-8 border-b hairline flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="eyebrow">{t("active.eyebrow")}</span>
      </div>

      <div className="px-6 py-8 md:px-8 md:py-10">
        <div className="eyebrow mb-2">{t("active.latest")}</div>
        <div className="numeric text-7xl md:text-8xl leading-[0.85]">
          {Math.round(latest.rmssdMs)}
          <span className="text-fg-dim text-2xl md:text-3xl ml-2">{t("unit")}</span>
        </div>
        {readinessLabel ? (
          <p className="font-display text-2xl md:text-3xl mt-5 leading-tight">
            {readinessLabel}
          </p>
        ) : null}

        <div className="mt-7 max-w-[220px]">
          <ReadinessLadder bucket={latest.readinessBucket} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-line border-t hairline">
        <div className="bg-bg-2 px-6 py-4 md:px-8">
          <div className="eyebrow mb-1">{t("active.mean7d")}</div>
          <div className="numeric text-2xl">
            {meanMs != null ? meanMs : "—"}
            {meanMs != null ? (
              <span className="text-fg-dim text-sm ml-1">{t("unit")}</span>
            ) : null}
          </div>
        </div>
        <div className="bg-bg-2 px-6 py-4 md:px-8">
          <div className="eyebrow mb-1">{t("active.source")}</div>
          <div className="text-sm text-fg/90 pt-1">{provider}</div>
        </div>
      </div>

      <div className="px-6 py-3 md:px-8 border-t hairline">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          {t("syncedFrom", { provider })}
        </span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Connected, but no readings synced yet                            */
/* ---------------------------------------------------------------- */

function StatePendingFirstSync({ provider, t }: { provider: string; t: PageT }) {
  return (
    <section className="surface-2 rounded-2xl px-6 py-8 md:px-8 md:py-10">
      <SectionHeader
        eyebrow={t("pending.eyebrow")}
        title={t("pending.title", { provider })}
      />
      <p className="text-fg-dim text-sm md:text-base leading-relaxed max-w-md">
        {t("pending.body", { provider })}
      </p>
    </section>
  );
}
