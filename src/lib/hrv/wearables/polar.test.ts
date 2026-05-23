import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { polarProvider } from "./polar";

const AUTH_URL = "https://flow.polar.com/oauth2/authorization";
const TOKEN_URL = "https://polarremote.com/v2/oauth2/token";
const USERS_URL = "https://www.polaraccesslink.com/v3/users";
const RECHARGE_URL =
  "https://www.polaraccesslink.com/v3/users/nightly-recharge";

/** Polar tokens never expire — provider reports a 100-year sentinel. */
const NEVER_EXPIRES = 100 * 365 * 24 * 3600;

function jsonResponse(body: unknown, ok = true, status?: number): Response {
  return {
    ok,
    status: status ?? (ok ? 200 : 400),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("polarProvider", () => {
  beforeEach(() => {
    process.env.POLAR_CLIENT_ID = "test-client-id";
    process.env.POLAR_CLIENT_SECRET = "test-client-secret";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("has id 'polar'", () => {
    expect(polarProvider.id).toBe("polar");
  });

  describe("getAuthUrl", () => {
    it("builds the Polar authorize URL with required query params", () => {
      const url = polarProvider.getAuthUrl(
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
      expect(scope).toContain("accesslink.read_all");
    });
  });

  describe("exchangeCode", () => {
    it("posts a Basic-auth authorization_code grant and maps the response", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at",
          token_type: "bearer",
          x_user_id: 777,
        }),
      );

      const tokens = await polarProvider.exchangeCode(
        "auth-code-123",
        "https://app.example.com/cb",
      );

      expect(tokens).toEqual({
        accessToken: "at",
        refreshToken: null,
        expiresInSeconds: NEVER_EXPIRES,
        providerUserId: "777",
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(TOKEN_URL);
      expect(init.method).toBe("POST");
      expect(init.headers["Content-Type"]).toBe(
        "application/x-www-form-urlencoded",
      );
      const expectedBasic =
        "Basic " +
        Buffer.from("test-client-id:test-client-secret").toString("base64");
      expect(init.headers["Authorization"]).toBe(expectedBasic);
      const body = String(init.body);
      expect(body).toContain("grant_type=authorization_code");
      expect(body).toContain("code=auth-code-123");
      expect(body).toContain(
        "redirect_uri=https%3A%2F%2Fapp.example.com%2Fcb",
      );
    });

    it("throws when the token response is not ok", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_grant" }, false),
      );
      await expect(
        polarProvider.exchangeCode("bad", "https://app.example.com/cb"),
      ).rejects.toThrow();
    });
  });

  describe("refreshTokens", () => {
    it("throws — Polar tokens do not expire", async () => {
      await expect(polarProvider.refreshTokens("anything")).rejects.toThrow();
    });
  });

  describe("registerUser", () => {
    it("posts a Bearer member-id registration that resolves on 201", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(jsonResponse({}, true, 201));

      await expect(
        polarProvider.registerUser!("at", "member-uuid"),
      ).resolves.toBeUndefined();

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(calledUrl).toBe(USERS_URL);
      expect(init.method).toBe("POST");
      expect(init.headers["Authorization"]).toBe("Bearer at");
      expect(init.headers["Content-Type"]).toBe("application/json");
      expect(JSON.parse(String(init.body))).toEqual({
        "member-id": "member-uuid",
      });
    });

    it("resolves on 409 Conflict (member already registered)", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "conflict" }, false, 409),
      );
      await expect(
        polarProvider.registerUser!("at", "member-uuid"),
      ).resolves.toBeUndefined();
    });

    it("throws on a 500 server error", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "server" }, false, 500),
      );
      await expect(
        polarProvider.registerUser!("at", "member-uuid"),
      ).rejects.toThrow();
    });
  });

  describe("fetchLatestHrv", () => {
    it("requests nightly-recharge with a Bearer header and maps the latest record", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          recharges: [
            {
              date: "2026-05-17",
              heart_rate_variability_avg: 38,
              heart_rate_avg: 51,
            },
            {
              date: "2026-05-18",
              heart_rate_variability_avg: 42,
              heart_rate_avg: 49,
            },
          ],
        }),
      );

      const reading = await polarProvider.fetchLatestHrv("at");

      expect(reading).toEqual({
        rmssdMs: 42,
        restingHeartRateBpm: 49,
        recordedAt: "2026-05-18T00:00:00Z",
        providerCalibrating: false,
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl, init] = fetchMock.mock.calls[0];
      expect(String(calledUrl).startsWith(RECHARGE_URL)).toBe(true);
      const method = init?.method ?? "GET";
      expect(method).toBe("GET");
      expect(init.headers["Authorization"]).toBe("Bearer at");
    });

    it("returns null when the recharge list is empty", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(jsonResponse({ recharges: [] }));
      expect(await polarProvider.fetchLatestHrv("at")).toBeNull();
    });

    it("maps a missing heart_rate_avg to null", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          recharges: [
            { date: "2026-05-18", heart_rate_variability_avg: 42 },
          ],
        }),
      );
      const reading = await polarProvider.fetchLatestHrv("at");
      expect(reading).toEqual({
        rmssdMs: 42,
        restingHeartRateBpm: null,
        recordedAt: "2026-05-18T00:00:00Z",
        providerCalibrating: false,
      });
    });

    it("returns null when the latest record lacks the HRV field (no fallback)", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          recharges: [
            {
              date: "2026-05-17",
              heart_rate_variability_avg: 38,
              heart_rate_avg: 51,
            },
            { date: "2026-05-18", heart_rate_avg: 49 },
          ],
        }),
      );
      expect(await polarProvider.fetchLatestHrv("at")).toBeNull();
    });

    it("throws when the recharge response is not ok", async () => {
      const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ error: "unauthorized" }, false),
      );
      await expect(polarProvider.fetchLatestHrv("bad")).rejects.toThrow();
    });
  });
});
