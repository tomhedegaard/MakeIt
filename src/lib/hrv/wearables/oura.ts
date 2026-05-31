import type {
  WearableProvider,
  WearableHrvReading,
  WearableTokens,
} from "./types";

const AUTHORIZE_URL = "https://cloud.ouraring.com/oauth/authorize";
const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const SLEEP_URL = "https://api.ouraring.com/v2/usercollection/sleep";
const SCOPE = "daily";

/** Read Oura OAuth credentials at call time so tests can stub env. */
function credentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "OURA_CLIENT_ID and OURA_CLIENT_SECRET must be set in the environment.",
    );
  }
  return { clientId, clientSecret };
}

/** Raw shape of Oura's OAuth token response. */
interface OuraTokenResponse {
  access_token: string;
  refresh_token?: string | null;
  expires_in: number;
  token_type?: string;
}

/** Raw shape of a single Oura daily sleep document. */
interface OuraSleepDocument {
  id?: string;
  day?: string;
  average_hrv?: number | null;
  lowest_heart_rate?: number | null;
  bedtime_end?: string;
}

interface OuraSleepResponse {
  data?: OuraSleepDocument[];
  next_token?: string | null;
}

function mapTokens(raw: OuraTokenResponse): WearableTokens {
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
    throw new Error(`Oura token request failed (${res.status}): ${detail}`);
  }
  return mapTokens((await res.json()) as OuraTokenResponse);
}

/** Format a Date as a UTC `YYYY-MM-DD` string. */
function utcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const ouraProvider: WearableProvider = {
  id: "oura",

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
    });
    return postTokenRequest(params);
  },

  async fetchLatestHrv(
    accessToken: string,
  ): Promise<WearableHrvReading | null> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const url = new URL(SLEEP_URL);
    url.searchParams.set("start_date", utcDate(sevenDaysAgo));
    url.searchParams.set("end_date", utcDate(now));

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Oura sleep request failed (${res.status}): ${detail}`);
    }

    const body = (await res.json()) as OuraSleepResponse;
    const docs = body.data ?? [];
    if (docs.length === 0) return null;

    // Most recent sleep document by precise per-doc `bedtime_end` timestamp.
    const latest = [...docs].sort((a, b) =>
      (b.bedtime_end ?? "").localeCompare(a.bedtime_end ?? ""),
    )[0];

    // No fallback: if the most recent document lacks HRV, report nothing.
    if (latest.average_hrv == null) return null;

    return {
      rmssdMs: latest.average_hrv,
      restingHeartRateBpm: latest.lowest_heart_rate ?? null,
      recordedAt: latest.bedtime_end ?? "",
      providerCalibrating: false,
    };
  },
};
