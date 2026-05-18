import { describe, it, expect, vi } from "vitest";
import { syncConnection } from "./sync";
import type { SyncConnectionInput } from "./sync";
import type {
  WearableProvider,
  WearableHrvReading,
  WearableTokens,
} from "./types";
import { computeLnRmssd } from "@/lib/hrv/rmssd";

const NOW = new Date("2026-05-18T12:00:00.000Z");

function makeProvider(): WearableProvider {
  return {
    id: "whoop",
    getAuthUrl: vi.fn(),
    exchangeCode: vi.fn(),
    refreshTokens: vi.fn(),
    fetchLatestHrv: vi.fn(),
  } as unknown as WearableProvider;
}

function makeConnection(
  overrides: Partial<SyncConnectionInput["connection"]> = {},
): SyncConnectionInput["connection"] {
  return {
    id: "conn-1",
    memberId: "member-1",
    provider: "whoop",
    accessToken: "old-access",
    refreshToken: "refresh-1",
    tokenExpiresAt: "2026-05-18T13:00:00.000Z", // 1h in the future
    ...overrides,
  };
}

const GOOD_READING: WearableHrvReading = {
  rmssdMs: 48,
  restingHeartRateBpm: 52,
  recordedAt: "2026-05-18T06:30:00.000Z",
  providerCalibrating: false,
};

const REFRESHED_TOKENS: WearableTokens = {
  accessToken: "new-access",
  refreshToken: "new-refresh",
  expiresInSeconds: 3600,
  providerUserId: "whoop-user-9",
};

describe("syncConnection", () => {
  it("(a) refreshes expired tokens and fetches with the NEW access token", async () => {
    const provider = makeProvider();
    (provider.refreshTokens as ReturnType<typeof vi.fn>).mockResolvedValue(
      REFRESHED_TOKENS,
    );
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue(
      GOOD_READING,
    );

    const result = await syncConnection({
      connection: makeConnection({
        tokenExpiresAt: "2026-05-18T11:00:00.000Z", // 1h in the past
      }),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: null,
      now: NOW,
    });

    expect(provider.refreshTokens).toHaveBeenCalledWith("refresh-1");
    expect(provider.fetchLatestHrv).toHaveBeenCalledWith("new-access");
    expect(result.tokens).toEqual(REFRESHED_TOKENS);
  });

  it("(b) does NOT refresh when token is comfortably in the future", async () => {
    const provider = makeProvider();
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue(
      GOOD_READING,
    );

    const result = await syncConnection({
      connection: makeConnection(),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: null,
      now: NOW,
    });

    expect(provider.refreshTokens).not.toHaveBeenCalled();
    expect(provider.fetchLatestHrv).toHaveBeenCalledWith("old-access");
    expect(result.tokens).toBeUndefined();
  });

  it("(c) returns skipped when fetchLatestHrv resolves null", async () => {
    const provider = makeProvider();
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );

    const result = await syncConnection({
      connection: makeConnection(),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: null,
      now: NOW,
    });

    expect(result.status).toBe("skipped");
  });

  it("(d) returns skipped when the reading is providerCalibrating", async () => {
    const provider = makeProvider();
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...GOOD_READING,
      providerCalibrating: true,
    });

    const result = await syncConnection({
      connection: makeConnection(),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: null,
      now: NOW,
    });

    expect(result.status).toBe("skipped");
  });

  it("(e) maps a good reading into the hrv_readings payload", async () => {
    const provider = makeProvider();
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue(
      GOOD_READING,
    );

    const priorLnRmssd = Array.from({ length: 20 }, () =>
      computeLnRmssd(45),
    );

    const result = await syncConnection({
      connection: makeConnection(),
      provider,
      priorLnRmssd,
      lastReadingProviderRecordedAt: null,
      now: NOW,
    });

    expect(result.status).toBe("reading");
    if (result.status !== "reading") throw new Error("expected reading");

    const { reading } = result;
    expect(reading.warm_up_state).toBe("active");
    expect(reading.source).toBe("whoop");
    expect(reading.confidence).toBe("high");
    expect(reading.resting_hr_bpm).toBe(52);
    expect(reading.ln_rmssd).toBe(computeLnRmssd(48));
    expect(reading.connection_id).toBe("conn-1");
    expect(reading.member_id).toBe("member-1");
    expect(reading.mean_hr_bpm).toBeNull();
    expect(reading.measured_at).toBe("2026-05-18T06:30:00.000Z");
    expect(reading.provider_recorded_at).toBe("2026-05-18T06:30:00.000Z");
    expect(reading.rmssd_ms).toBe(48);
    expect(reading.rr_intervals).toBeNull();
    expect(reading.timezone).toBeNull();
    expect(reading.is_sick).toBe(false);
    expect(reading.readiness_bucket).not.toBeNull();
  });

  it("(f) errors when an expired token has no refresh token", async () => {
    const provider = makeProvider();

    const result = await syncConnection({
      connection: makeConnection({
        tokenExpiresAt: "2026-05-18T11:00:00.000Z",
        refreshToken: null,
      }),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: null,
      now: NOW,
    });

    expect(result.status).toBe("error");
    if (result.status !== "error") throw new Error("expected error");
    expect(result.reason).toBe("no_refresh_token");
    expect(provider.refreshTokens).not.toHaveBeenCalled();
  });

  it("(g) skips a good reading whose recordedAt matches lastReadingProviderRecordedAt", async () => {
    const provider = makeProvider();
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue(
      GOOD_READING,
    );

    const result = await syncConnection({
      connection: makeConnection(),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: GOOD_READING.recordedAt,
      now: NOW,
    });

    expect(result.status).toBe("skipped");
  });

  it("(h) still produces a reading when recordedAt differs from lastReadingProviderRecordedAt", async () => {
    const provider = makeProvider();
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue(
      GOOD_READING,
    );

    const result = await syncConnection({
      connection: makeConnection(),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: "2026-05-17T06:30:00.000Z",
      now: NOW,
    });

    expect(result.status).toBe("reading");
  });

  it("(i) returns refreshed tokens even when the reading is skipped as a duplicate", async () => {
    const provider = makeProvider();
    (provider.refreshTokens as ReturnType<typeof vi.fn>).mockResolvedValue(
      REFRESHED_TOKENS,
    );
    (provider.fetchLatestHrv as ReturnType<typeof vi.fn>).mockResolvedValue(
      GOOD_READING,
    );

    const result = await syncConnection({
      connection: makeConnection({
        tokenExpiresAt: "2026-05-18T11:00:00.000Z", // expired
      }),
      provider,
      priorLnRmssd: [],
      lastReadingProviderRecordedAt: GOOD_READING.recordedAt,
      now: NOW,
    });

    expect(result.status).toBe("skipped");
    expect(result.tokens).toEqual(REFRESHED_TOKENS);
  });
});
