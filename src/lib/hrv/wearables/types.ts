/** A normalized HRV reading pulled from a wearable provider. */
export interface WearableHrvReading {
  rmssdMs: number;
  restingHeartRateBpm: number | null;
  recordedAt: string;        // ISO — provider's measurement timestamp
  providerCalibrating: boolean; // true => provider says data not yet reliable
}

/** OAuth token set as returned by a provider. */
export interface WearableTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  providerUserId: string | null;
}

/** Provider-agnostic wearable integration. One implementation per provider. */
export interface WearableProvider {
  readonly id: "whoop" | "oura" | "polar";
  /** Build the OAuth authorize URL to redirect the member to. */
  getAuthUrl(state: string, redirectUri: string): string;
  /** Exchange an authorization code for tokens. */
  exchangeCode(code: string, redirectUri: string): Promise<WearableTokens>;
  /** Refresh an expired access token. Returns a fresh token set. */
  refreshTokens(refreshToken: string): Promise<WearableTokens>;
  /** Fetch the member's most recent HRV reading, or null if none. */
  fetchLatestHrv(accessToken: string): Promise<WearableHrvReading | null>;
}
