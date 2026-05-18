/**
 * Provider-agnostic wearable sync orchestration.
 *
 * `syncConnection` is PURE logic — it performs no DB access and no `fetch` of
 * its own; it calls the injected `WearableProvider`. The Task 9 cron is
 * responsible for the connection-scoped DB read (`priorLnRmssd`) and for
 * persisting the returned reading payload and any refreshed tokens.
 */
import type { WarmUpState, ReadinessBucket } from "../types";
import { computeLnRmssd } from "@/lib/hrv/rmssd";
import { computeBaseline } from "@/lib/hrv/baseline";
import type { WearableProvider, WearableTokens } from "./types";

/** Treat a token as expired if it has under this much life left (ms). */
const EXPIRY_SKEW_MS = 60_000;

/** A wearable connection with already-DECRYPTED tokens. */
export interface SyncConnection {
  id: string;
  memberId: string;
  provider: "whoop" | "oura" | "polar";
  accessToken: string;
  refreshToken: string | null;
  /** ISO timestamp, or null if unknown (treated as expired). */
  tokenExpiresAt: string | null;
}

export interface SyncConnectionInput {
  connection: SyncConnection;
  provider: WearableProvider;
  /** Member's prior lnRMSSD values for THIS connection, chronological. */
  priorLnRmssd: number[];
  /**
   * ISO timestamp of the connection's most recent existing
   * `hrv_readings.provider_recorded_at`, or `null` if it has no readings yet.
   * Used to skip re-inserting a reading the provider has already given us.
   */
  lastReadingProviderRecordedAt: string | null;
  /** Injected current time for testability. */
  now: Date;
}

/** Row payload for `hrv_readings` (snake_case — inserted by Task 9). */
export interface HrvReadingPayload {
  member_id: string;
  connection_id: string;
  measured_at: string;
  provider_recorded_at: string;
  source: "whoop" | "oura" | "polar";
  confidence: "high";
  rmssd_ms: number;
  ln_rmssd: number;
  mean_hr_bpm: null;
  resting_hr_bpm: number | null;
  rolling_7d_mean_lnrmssd: number;
  baseline_60d_mean_lnrmssd: number;
  baseline_60d_swc: number;
  warm_up_state: WarmUpState;
  readiness_bucket: ReadinessBucket | null;
  rr_intervals: null;
  timezone: null;
  is_sick: false;
}

export type SyncResult =
  | { status: "reading"; tokens?: WearableTokens; reading: HrvReadingPayload }
  | {
      status: "skipped";
      tokens?: WearableTokens;
      reason?: "no_reading" | "calibrating" | "already_synced";
    }
  | { status: "error"; tokens?: WearableTokens; reason: "no_refresh_token" };

/** True when `tokenExpiresAt` is null or within the skew window of `now`. */
function isExpired(tokenExpiresAt: string | null, now: Date): boolean {
  if (tokenExpiresAt === null) return true;
  const expiresAtMs = new Date(tokenExpiresAt).getTime();
  return expiresAtMs - now.getTime() < EXPIRY_SKEW_MS;
}

/**
 * Turn a wearable's latest reading into a `hrv_readings` row payload.
 *
 * 1. Refresh tokens if expired (error if no refresh token available).
 * 2. Fetch the latest HRV reading.
 * 3. Skip if there is no reading, or the provider is still calibrating.
 * 4. Skip if the reading was already synced (its `recordedAt` matches the
 *    connection's most recent stored `provider_recorded_at`).
 * 5. Otherwise compute lnRMSSD + baseline and return the mapped payload.
 */
export async function syncConnection(
  input: SyncConnectionInput,
): Promise<SyncResult> {
  const { connection, provider, priorLnRmssd, lastReadingProviderRecordedAt, now } =
    input;

  let accessToken = connection.accessToken;
  let tokens: WearableTokens | undefined;

  if (isExpired(connection.tokenExpiresAt, now)) {
    if (connection.refreshToken === null) {
      return { status: "error", reason: "no_refresh_token" };
    }
    tokens = await provider.refreshTokens(connection.refreshToken);
    accessToken = tokens.accessToken;
  }

  const reading = await provider.fetchLatestHrv(accessToken);

  if (reading === null) {
    return { status: "skipped", tokens, reason: "no_reading" };
  }
  if (reading.providerCalibrating) {
    return { status: "skipped", tokens, reason: "calibrating" };
  }

  // Dedup: the provider yields ~one recovery per sleep cycle. If the fetched
  // reading carries the same `recordedAt` as the connection's most recent
  // stored row, it is the same reading — skip without inserting a duplicate.
  if (
    lastReadingProviderRecordedAt !== null &&
    new Date(reading.recordedAt).getTime() ===
      new Date(lastReadingProviderRecordedAt).getTime()
  ) {
    return { status: "skipped", tokens, reason: "already_synced" };
  }

  const lnRmssd = computeLnRmssd(reading.rmssdMs);
  const base = computeBaseline([...priorLnRmssd, lnRmssd]);

  const payload: HrvReadingPayload = {
    member_id: connection.memberId,
    connection_id: connection.id,
    measured_at: reading.recordedAt,
    provider_recorded_at: reading.recordedAt,
    source: connection.provider,
    confidence: "high",
    rmssd_ms: reading.rmssdMs,
    ln_rmssd: lnRmssd,
    mean_hr_bpm: null,
    resting_hr_bpm: reading.restingHeartRateBpm,
    rolling_7d_mean_lnrmssd: base.rolling7dMean,
    baseline_60d_mean_lnrmssd: base.baseline60dMean,
    baseline_60d_swc: base.swc,
    warm_up_state: base.warmUpState,
    readiness_bucket: base.readinessBucket,
    rr_intervals: null,
    timezone: null,
    is_sick: false,
  };

  return { status: "reading", tokens, reading: payload };
}
