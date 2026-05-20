import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { mockListReadings } from "@/lib/hrv/mock";
import { getTodayLifestyleLogs } from "@/lib/data/hrv";
import type { ReadinessBucket, WarmUpState } from "@/lib/hrv/types";
import HrvSubNav from "@/components/hrv/HrvSubNav";
import ReadinessLadder from "@/components/hrv/ReadinessLadder";
import LifestyleLogCard from "@/components/hrv/LifestyleLogCard";
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

/** Danish labels for each readiness bucket. */
const READINESS_LABEL: Record<ReadinessBucket, string> = {
  very_low: "Langt under din norm",
  low: "Under din norm",
  normal: "I dit normale område",
  high: "Over din norm",
  very_high: "Langt over din norm",
};

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
function providerName(provider: string | null): string {
  if (provider === "whoop") return "WHOOP";
  if (provider === "oura") return "Oura";
  if (provider === "polar") return "Polar";
  return "din wearable";
}

export default async function HrvPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const state = SUPABASE_ENABLED
    ? await resolveConnectedState(member.id)
    : ({
        connected: false,
        needsReauth: false,
        provider: null,
        // Demo mode: there's no connection, so this only feeds the
        // (unused) reading count. Kept consistent for completeness.
        readingCount: mockListReadings("demo-member").length,
        latest: null,
      } satisfies HrvState);

  const provider = providerName(state.provider);

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
        eyebrow="Recovery"
        title="HRV"
        subtitle="Din hjerterytmevariabilitet — et dagligt mål for, hvor klar din krop er til at træne."
      />
      <Container className="py-8 lg:py-12 space-y-8">
        <HrvSubNav />

        {state.needsReauth ? (
          <div
            role="alert"
            className="surface-2 rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4"
            style={{ borderColor: "var(--line-bright)" }}
          >
            <div className="flex-1">
              <div className="eyebrow mb-1">Forbindelse afbrudt</div>
              <p className="text-sm text-fg-dim">
                Din forbindelse til {provider} skal fornyes for at fortsætte
                med at synke din HRV.
              </p>
            </div>
            <ConnectButton label="Forny forbindelse" variant="reauth" />
          </div>
        ) : null}

        {!state.connected ? (
          <StateNotConnected />
        ) : state.latest && state.latest.warmUpState !== "active" ? (
          <StateWarmingUp
            rmssdMs={state.latest.rmssdMs}
            daysLeft={daysRemaining(
              state.latest.warmUpState,
              state.readingCount,
            )}
            provider={provider}
          />
        ) : state.latest ? (
          <StateActive latest={state.latest} provider={provider} />
        ) : (
          // Connected, but no readings synced yet — first sync pending.
          <StatePendingFirstSync provider={provider} />
        )}

        {lifestyleCard}
      </Container>
    </>
  );
}

/* ---------------------------------------------------------------- */
/* State A — no active wearable connection                          */
/* ---------------------------------------------------------------- */

function StateNotConnected() {
  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-7 md:px-8 md:py-10 border-b hairline">
        <div className="eyebrow mb-3">Kom i gang</div>
        <h2 className="font-display text-3xl md:text-4xl leading-[1.02] mb-3">
          Lad din HRV køre i baggrunden.
        </h2>
        <p className="text-fg-dim text-sm md:text-base leading-relaxed max-w-xl">
          HRV — hjerterytmevariabilitet — fortæller, hvor restitueret du er.
          Forbind en wearable, så synker MakeIt din HRV automatisk hver
          morgen. Ingen manuel måling, ingen ekstra rutine — den er der bare,
          når du vågner.
        </p>
      </div>

      <ol className="divide-y hairline">
        {[
          {
            n: "01",
            t: "Forbind dit wearable",
            d: "Ét tryk — du godkender adgang hos din wearable-udbyder.",
          },
          {
            n: "02",
            t: "HRV synker hver morgen",
            d: "MakeIt henter nattens måling automatisk. Du gør ingenting.",
          },
          {
            n: "03",
            t: "Vi bygger din baseline",
            d: "De første par uger lærer MakeIt din normal — derefter ser du din readiness.",
          },
        ].map((row) => (
          <li key={row.n} className="px-6 py-4 md:px-8 flex items-start gap-4">
            <span className="numeric text-fg-faint text-xs w-7 pt-0.5 shrink-0">
              {row.n}
            </span>
            <div className="min-w-0">
              <div className="text-fg/90 text-sm md:text-base">{row.t}</div>
              <div className="text-fg-dim text-xs md:text-sm mt-0.5 leading-relaxed">
                {row.d}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="p-5 md:p-8 space-y-4">
        <ConnectButton label="Forbind dit wearable" />
        <p className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
          Apple Watch-support kommer med MakeIt-appen til iPhone.
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
}: {
  rmssdMs: number;
  daysLeft: number;
  provider: string;
}) {
  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 md:px-8 border-b hairline flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="eyebrow">Bygger din baseline</span>
      </div>

      <div className="px-6 py-8 md:px-8 md:py-10">
        <div className="eyebrow mb-2">Seneste HRV</div>
        <div className="numeric text-6xl md:text-7xl leading-[0.9]">
          {Math.round(rmssdMs)}
          <span className="text-fg-dim text-2xl md:text-3xl ml-2">ms</span>
        </div>
        <p className="text-fg-dim text-sm md:text-base mt-5 max-w-md leading-relaxed">
          Vi bygger din baseline.{" "}
          <span className="text-fg">
            {daysLeft} {daysLeft === 1 ? "dag" : "dage"} tilbage.
          </span>{" "}
          Indtil da viser vi din rå måling — readiness kommer, når MakeIt
          kender din normal.
        </p>
      </div>

      <div className="px-6 py-3 md:px-8 border-t hairline">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          Synket fra {provider}
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
}: {
  latest: LatestReading;
  provider: string;
}) {
  const meanMs =
    latest.rolling7dMeanLnRmssd != null
      ? Math.round(Math.exp(latest.rolling7dMeanLnRmssd))
      : null;
  const readinessLabel = latest.readinessBucket
    ? READINESS_LABEL[latest.readinessBucket]
    : null;

  return (
    <section className="surface-2 rounded-2xl overflow-hidden">
      <div className="px-6 py-5 md:px-8 border-b hairline flex items-center gap-2">
        <span className="pulse-dot" />
        <span className="eyebrow">Dagens readiness</span>
      </div>

      <div className="px-6 py-8 md:px-8 md:py-10">
        <div className="eyebrow mb-2">HRV i morges</div>
        <div className="numeric text-7xl md:text-8xl leading-[0.85]">
          {Math.round(latest.rmssdMs)}
          <span className="text-fg-dim text-2xl md:text-3xl ml-2">ms</span>
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
          <div className="eyebrow mb-1">7-dages snit</div>
          <div className="numeric text-2xl">
            {meanMs != null ? meanMs : "—"}
            {meanMs != null ? (
              <span className="text-fg-dim text-sm ml-1">ms</span>
            ) : null}
          </div>
        </div>
        <div className="bg-bg-2 px-6 py-4 md:px-8">
          <div className="eyebrow mb-1">Kilde</div>
          <div className="text-sm text-fg/90 pt-1">{provider}</div>
        </div>
      </div>

      <div className="px-6 py-3 md:px-8 border-t hairline">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
          Synket fra {provider}
        </span>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- */
/* Connected, but no readings synced yet                            */
/* ---------------------------------------------------------------- */

function StatePendingFirstSync({ provider }: { provider: string }) {
  return (
    <section className="surface-2 rounded-2xl px-6 py-8 md:px-8 md:py-10">
      <div className="eyebrow mb-3">Forbundet</div>
      <h2 className="font-display text-2xl md:text-3xl leading-tight mb-3">
        {provider} er forbundet.
      </h2>
      <p className="text-fg-dim text-sm md:text-base leading-relaxed max-w-md">
        Din første HRV-måling synker næste gang {provider} har en nats data.
        Kig forbi i morgen tidlig.
      </p>
    </section>
  );
}
