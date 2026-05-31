import type {
  WearableProvider,
  WearableHrvReading,
  WearableTokens,
} from "./types";

const AUTHORIZE_URL = "https://flow.polar.com/oauth2/authorization";
const TOKEN_URL = "https://polarremote.com/v2/oauth2/token";
const USERS_URL = "https://www.polaraccesslink.com/v3/users";
const RECHARGE_URL =
  "https://www.polaraccesslink.com/v3/users/nightly-recharge";
const SCOPE = "accesslink.read_all";

/**
 * Polar access tokens do not expire. The interface still requires an
 * `expiresInSeconds`, so we report a far-future sentinel (100 years).
 */
const NEVER_EXPIRES_SECONDS = 100 * 365 * 24 * 3600;

/** Read Polar OAuth credentials at call time so tests can stub env. */
function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.POLAR_CLIENT_ID;
  const clientSecret = process.env.POLAR_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "POLAR_CLIENT_ID and POLAR_CLIENT_SECRET must be set in the environment.",
    );
  }
  return { clientId, clientSecret };
}

/** Raw shape of Polar's OAuth token response. */
interface PolarTokenResponse {
  access_token: string;
  token_type?: string;
  x_user_id?: number | string;
}

/** Raw shape of a single Polar Nightly Recharge record. */
interface PolarRechargeRecord {
  date?: string;
  heart_rate_avg?: number | null;
  heart_rate_variability_avg?: number | null;
  breathing_rate_avg?: number | null;
  ans_charge?: number | null;
}

interface PolarRechargeResponse {
  recharges?: PolarRechargeRecord[];
}

export const polarProvider: WearableProvider = {
  id: "polar",

  getAuthUrl(state: string, redirectUri: string): string {
    const { clientId } = credentials();
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<WearableTokens> {
    const { clientId, clientSecret } = credentials();
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64",
    );
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Polar token request failed (${res.status}): ${detail}`,
      );
    }
    const raw = (await res.json()) as PolarTokenResponse;
    return {
      accessToken: raw.access_token,
      refreshToken: null,
      expiresInSeconds: NEVER_EXPIRES_SECONDS,
      providerUserId:
        raw.x_user_id != null ? String(raw.x_user_id) : null,
    };
  },

  async refreshTokens(): Promise<WearableTokens> {
    throw new Error("polar tokens do not expire");
  },

  /**
   * Register the member with the Polar AccessLink app. Required once after
   * the OAuth token exchange before any data can be pulled. A 409 Conflict
   * means the member is already registered and is treated as success.
   */
  async registerUser(accessToken: string, memberId: string): Promise<void> {
    const res = await fetch(USERS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ "member-id": memberId }),
    });
    if (res.ok || res.status === 409) return;
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Polar user registration failed (${res.status}): ${detail}`,
    );
  },

  async fetchLatestHrv(
    accessToken: string,
  ): Promise<WearableHrvReading | null> {
    const res = await fetch(RECHARGE_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `Polar nightly-recharge request failed (${res.status}): ${detail}`,
      );
    }

    const body = (await res.json()) as PolarRechargeResponse;
    const records = body.recharges ?? [];
    if (records.length === 0) return null;

    // Most recent Nightly Recharge by `date` (YYYY-MM-DD, lexically sortable).
    const latest = [...records].sort((a, b) =>
      (b.date ?? "").localeCompare(a.date ?? ""),
    )[0];

    // No fallback: if the most recent record lacks HRV, report nothing.
    if (latest.heart_rate_variability_avg == null) return null;

    return {
      rmssdMs: latest.heart_rate_variability_avg,
      restingHeartRateBpm: latest.heart_rate_avg ?? null,
      recordedAt: `${latest.date}T00:00:00Z`,
      providerCalibrating: false,
    };
  },
};
