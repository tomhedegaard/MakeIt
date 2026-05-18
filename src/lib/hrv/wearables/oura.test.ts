import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ouraProvider } from "./oura";

const TOKEN_URL = "https://api.ouraring.com/oauth/token";
const AUTH_URL = "https://cloud.ouraring.com/oauth/authorize";
const SLEEP_URL = "https://api.ouraring.com/v2/usercollection/sleep";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("ouraProvider", () => {
  beforeEach(() => {
    process.env.OURA_CLIENT_ID = "test-client-id";
    process.env.OURA_CLIENT_SECRET = "test-client-secret";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("has id 'oura'", () => {
    expect(ouraProvider.id).toBe("oura");
  });

  describe("getAuthUrl", () => {
    it("builds the Oura authorize URL with required query params", () => {
      const url = ouraProvider.getAuthUrl(
        "state-abc",
        "https://app.example.com/cb",
      );
      expect(url.startsWith(AUTH_URL)).toBe(true);
      const parsed = new URL(url);
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "https://app.example.com/cb",
      );
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("state")).toBe("state-abc");
      const scope = parsed.searchParams.get("scope") ?? "";
      expect(scope).toContain("daily");
    });
  });

  describe("exchangeCode", () => {
    it("posts a form-encoded authorization_code grant and maps the response", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at_xxx",
          refresh_token: "rt_xxx",
          expires_in: 2592000,
          token_type: "bearer",
        }),
      );

      const tokens = await ouraProvider.exchangeCode(
        "auth-code-123",
        "https://app.example.com/cb",
      );

      expect(tokens).toEqual({
        accessToken: "at_xxx",
        refreshToken: "rt_xxx",
        expiresInSeconds: 2592000,
        providerUserId: null,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(TOKEN_URL);
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe(
        "application/x-www-form-urlencoded",
      );
      const body = String(init.body);
      expect(body).toContain("grant_type=authorization_code");
      expect(body).toContain("code=auth-code-123");
      expect(body).toContain(
        "redirect_uri=https%3A%2F%2Fapp.example.com%2Fcb",
      );
      expect(body).toContain("client_id=test-client-id");
      expect(body).toContain("client_secret=test-client-secret");
    });

    it("throws when the token response is not ok", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_grant" }, false),
      );
      await expect(
        ouraProvider.exchangeCode("bad", "https://app.example.com/cb"),
      ).rejects.toThrow();
    });
  });

  describe("refreshTokens", () => {
    it("posts a refresh_token grant and maps the rotated response", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at_new",
          refresh_token: "rt_new",
          expires_in: 2592000,
          token_type: "bearer",
        }),
      );

      const tokens = await ouraProvider.refreshTokens("rt_old");

      expect(tokens).toEqual({
        accessToken: "at_new",
        refreshToken: "rt_new",
        expiresInSeconds: 2592000,
        providerUserId: null,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(TOKEN_URL);
      expect(init.method).toBe("POST");
      const body = String(init.body);
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=rt_old");
      expect(body).toContain("client_id=test-client-id");
      expect(body).toContain("client_secret=test-client-secret");
    });

    it("maps an absent refresh_token to null", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at_new",
          expires_in: 2592000,
          token_type: "bearer",
        }),
      );
      const tokens = await ouraProvider.refreshTokens("rt_old");
      expect(tokens.refreshToken).toBeNull();
    });
  });

  describe("fetchLatestHrv", () => {
    it("requests the sleep endpoint with a Bearer header and maps the doc", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "abc",
              day: "2026-05-18",
              average_hrv: 41,
              lowest_heart_rate: 49,
              bedtime_end: "2026-05-18T06:30:00+00:00",
            },
          ],
          next_token: null,
        }),
      );

      const reading = await ouraProvider.fetchLatestHrv("at_xxx");

      expect(reading).toEqual({
        rmssdMs: 41,
        restingHeartRateBpm: 49,
        recordedAt: "2026-05-18T06:30:00+00:00",
        providerCalibrating: false,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(String(calledUrl).startsWith(SLEEP_URL)).toBe(true);
      const method = init?.method ?? "GET";
      expect(method).toBe("GET");
      expect(init.headers["Authorization"]).toBe("Bearer at_xxx");
    });

    it("returns null when data is empty", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ data: [], next_token: null }),
      );
      expect(await ouraProvider.fetchLatestHrv("at_xxx")).toBeNull();
    });

    it("returns null when the single doc has a null average_hrv", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "abc",
              day: "2026-05-18",
              average_hrv: null,
              lowest_heart_rate: 49,
              bedtime_end: "2026-05-18T06:30:00+00:00",
            },
          ],
          next_token: null,
        }),
      );
      expect(await ouraProvider.fetchLatestHrv("at_xxx")).toBeNull();
    });

    it("returns null when the most recent doc has null average_hrv (no fallback)", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "older",
              day: "2026-05-17",
              average_hrv: 38,
              lowest_heart_rate: 51,
              bedtime_end: "2026-05-17T06:00:00+00:00",
            },
            {
              id: "newer",
              day: "2026-05-18",
              average_hrv: null,
              lowest_heart_rate: 49,
              bedtime_end: "2026-05-18T06:30:00+00:00",
            },
          ],
          next_token: null,
        }),
      );
      expect(await ouraProvider.fetchLatestHrv("at_xxx")).toBeNull();
    });

    it("returns the doc with the later bedtime_end when multiple are valid", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          data: [
            {
              id: "newer",
              day: "2026-05-18",
              average_hrv: 41,
              lowest_heart_rate: 49,
              bedtime_end: "2026-05-18T06:30:00+00:00",
            },
            {
              id: "older",
              day: "2026-05-17",
              average_hrv: 38,
              lowest_heart_rate: 51,
              bedtime_end: "2026-05-17T06:00:00+00:00",
            },
          ],
          next_token: null,
        }),
      );

      const reading = await ouraProvider.fetchLatestHrv("at_xxx");
      expect(reading).toEqual({
        rmssdMs: 41,
        restingHeartRateBpm: 49,
        recordedAt: "2026-05-18T06:30:00+00:00",
        providerCalibrating: false,
      });
    });

    it("throws when the sleep response is not ok", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "unauthorized" }, false),
      );
      await expect(ouraProvider.fetchLatestHrv("bad")).rejects.toThrow();
    });
  });
});
