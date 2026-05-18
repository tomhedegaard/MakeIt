import type {
  WearableProvider,
  WearableHrvReading,
  WearableTokens,
} from "./types";

const AUTHORIZE_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const RECOVERY_URL = "https://api.prod.whoop.com/developer/v2/recovery";
const SCOPE = "read:recovery offline";

/** Read WHOOP OAuth credentials at call time so tests can stub env. */
function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET must be set in the environment.",
    );
  }
  return { clientId, clientSecret };
}

/** Raw shape of WHOOP's OAuth token response. */
interface WhoopTokenResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_in: number;
  token_type?: string;
  scope?: string;
}

/** Raw shape of a single WHOOP recovery record. */
interface WhoopRecoveryRecord {
  created_at?: string;
  score_state?: string;
  score?: {
    user_calibrating?: boolean;
    recovery_score?: number;
    resting_heart_rate?: number | null;
    hrv_rmssd_milli?: number;
  } | null;
}

interface WhoopRecoveryResponse {
  records?: WhoopRecoveryRecord[];
  next_token?: string | null;
}

function mapTokens(raw: WhoopTokenResponse): WearableTokens {
  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token ?? null,
    expiresInSeconds: raw.expires_in,
    providerUserId: null,
  };
}

async function postTokenRequest(
  params: URLSearchParams,
): Promise<WearableTokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `WHOOP token request failed (${res.status}): ${detail}`,
    );
  }
  return mapTokens((await res.json()) as WhoopTokenResponse);
}

export const whoopProvider: WearableProvider = {
  id: "whoop",

  getAuthUrl(state: string, redirectUri: string): string {
    const { clientId } = credentials();
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPE);
    url.searchParams.set("state", state);
    return url.toString();
  },

  async exchangeCode(
    code: string,
    redirectUri: string,
  ): Promise<WearableTokens> {
    const { clientId, clientSecret } = credentials();
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });
    return postTokenRequest(params);
  },

  async refreshTokens(refreshToken: string): Promise<WearableTokens> {
    const { clientId, clientSecret } = credentials();
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      scope: "offline",
    });
    return postTokenRequest(params);
  },

  async fetchLatestHrv(
    accessToken: string,
  ): Promise<WearableHrvReading | null> {
    const url = new URL(RECOVERY_URL);
    url.searchParams.set("limit", "1");
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(
        `WHOOP recovery request failed (${res.status}): ${detail}`,
      );
    }
    const body = (await res.json()) as WhoopRecoveryResponse;
    const record = body.records?.[0];
    if (!record) return null;
    if (record.score_state !== "SCORED" || !record.score) return null;

    const score = record.score;
    return {
      rmssdMs: score.hrv_rmssd_milli ?? 0,
      restingHeartRateBpm: score.resting_heart_rate ?? null,
      recordedAt: record.created_at ?? "",
      providerCalibrating: score.user_calibrating ?? false,
    };
  },
};
