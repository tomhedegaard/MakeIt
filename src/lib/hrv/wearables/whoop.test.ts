import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { whoopProvider } from "./whoop";

const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const AUTH_URL = "https://api.prod.whoop.com/oauth/oauth2/auth";
const RECOVERY_URL = "https://api.prod.whoop.com/developer/v2/recovery";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 400,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("whoopProvider", () => {
  beforeEach(() => {
    process.env.WHOOP_CLIENT_ID = "test-client-id";
    process.env.WHOOP_CLIENT_SECRET = "test-client-secret";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("has id 'whoop'", () => {
    expect(whoopProvider.id).toBe("whoop");
  });

  describe("getAuthUrl", () => {
    it("builds the WHOOP authorize URL with required query params", () => {
      const url = whoopProvider.getAuthUrl(
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
      expect(scope).toContain("read:recovery");
      expect(scope).toContain("offline");
    });
  });

  describe("exchangeCode", () => {
    it("posts a form-encoded authorization_code grant and maps the response", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at_xxx",
          refresh_token: "rt_xxx",
          expires_in: 3600,
          token_type: "bearer",
          scope: "read:recovery offline",
        }),
      );

      const tokens = await whoopProvider.exchangeCode(
        "auth-code-123",
        "https://app.example.com/cb",
      );

      expect(tokens).toEqual({
        accessToken: "at_xxx",
        refreshToken: "rt_xxx",
        expiresInSeconds: 3600,
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
        whoopProvider.exchangeCode("bad", "https://app.example.com/cb"),
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
          expires_in: 3600,
          token_type: "bearer",
          scope: "read:recovery offline",
        }),
      );

      const tokens = await whoopProvider.refreshTokens("rt_old");

      expect(tokens).toEqual({
        accessToken: "at_new",
        refreshToken: "rt_new",
        expiresInSeconds: 3600,
        providerUserId: null,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(TOKEN_URL);
      expect(init.method).toBe("POST");
      const body = String(init.body);
      expect(body).toContain("grant_type=refresh_token");
      expect(body).toContain("refresh_token=rt_old");
      expect(body).toContain("scope=offline");
      expect(body).toContain("client_id=test-client-id");
    });

    it("maps an absent refresh_token to null", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at_new",
          expires_in: 3600,
          token_type: "bearer",
        }),
      );
      const tokens = await whoopProvider.refreshTokens("rt_old");
      expect(tokens.refreshToken).toBeNull();
    });
  });

  describe("fetchLatestHrv", () => {
    it("requests the recovery endpoint with a Bearer header and maps the record", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          records: [
            {
              cycle_id: 93845,
              sleep_id: "abc",
              user_id: 10129,
              created_at: "2026-05-18T06:00:00.000Z",
              updated_at: "2026-05-18T06:05:00.000Z",
              score_state: "SCORED",
              score: {
                user_calibrating: false,
                recovery_score: 61,
                resting_heart_rate: 52,
                hrv_rmssd_milli: 48.7,
              },
            },
          ],
          next_token: null,
        }),
      );

      const reading = await whoopProvider.fetchLatestHrv("at_xxx");

      expect(reading).toEqual({
        rmssdMs: 48.7,
        restingHeartRateBpm: 52,
        recordedAt: "2026-05-18T06:00:00.000Z",
        providerCalibrating: false,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(String(calledUrl).startsWith(RECOVERY_URL)).toBe(true);
      expect(String(calledUrl)).toContain("limit=1");
      const method = init?.method ?? "GET";
      expect(method).toBe("GET");
      expect(init.headers["Authorization"]).toBe("Bearer at_xxx");
    });

    it("returns null when there are no records", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ records: [], next_token: null }),
      );
      expect(await whoopProvider.fetchLatestHrv("at_xxx")).toBeNull();
    });

    it("returns null when the latest record has no usable score", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          records: [
            {
              cycle_id: 93845,
              created_at: "2026-05-18T06:00:00.000Z",
              score_state: "PENDING_SCORE",
            },
          ],
          next_token: null,
        }),
      );
      expect(await whoopProvider.fetchLatestHrv("at_xxx")).toBeNull();
    });

    it("throws when the recovery response is not ok", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "unauthorized" }, false),
      );
      await expect(whoopProvider.fetchLatestHrv("bad")).rejects.toThrow();
    });
  });
});
