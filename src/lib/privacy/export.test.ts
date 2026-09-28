import { describe, expect, it } from "vitest";
import daSettings from "../../../messages/da/Settings.json";
import enSettings from "../../../messages/en/Settings.json";
import {
  ART9_EXPORT_KEYS,
  EXPORT_COLLECTION_KEYS,
  buildExportPayload,
  emptyExportCollections,
  isCompletenessSlogan,
  redactPushSubscription,
  redactWearableConnection,
} from "./export";

describe("EXPORT_COLLECTION_KEYS", () => {
  it("includes the art. 9 / søjle 5 tables the old route omitted", () => {
    for (const key of ART9_EXPORT_KEYS) {
      expect(EXPORT_COLLECTION_KEYS).toContain(key);
    }
  });

  it("includes messages, weight, buddy, push and action logs", () => {
    expect(EXPORT_COLLECTION_KEYS).toContain("messages");
    expect(EXPORT_COLLECTION_KEYS).toContain("conversations");
    expect(EXPORT_COLLECTION_KEYS).toContain("weight_logs");
    expect(EXPORT_COLLECTION_KEYS).toContain("buddy_pairs");
    expect(EXPORT_COLLECTION_KEYS).toContain("push_subscriptions");
    expect(EXPORT_COLLECTION_KEYS).toContain("member_action_logs");
  });
});

describe("emptyExportCollections", () => {
  it("returns an empty array for every export key", () => {
    const empty = emptyExportCollections();
    expect(Object.keys(empty)).toEqual([...EXPORT_COLLECTION_KEYS]);
    for (const key of EXPORT_COLLECTION_KEYS) {
      expect(empty[key]).toEqual([]);
    }
  });
});

describe("buildExportPayload", () => {
  it("always exposes every collection key, even in demo", () => {
    const payload = buildExportPayload({
      exportedAt: "2026-08-31T00:00:00.000Z",
      mode: "demo",
      note: "Demo-mode har ingen connected database.",
      member: null,
    });
    expect(payload.mode).toBe("demo");
    expect(payload.member).toBeNull();
    expect(payload.omitted).toEqual([]);
    for (const key of EXPORT_COLLECTION_KEYS) {
      expect(payload[key]).toEqual([]);
    }
  });

  it("merges provided rows onto the empty skeleton", () => {
    const payload = buildExportPayload({
      exportedAt: "2026-08-31T00:00:00.000Z",
      mode: "connected",
      note: "Dine egne medlemsrækker under dit login.",
      member: { id: "m1" },
      collections: {
        journal_entries: [{ id: "j1", body: "hej" }],
        mind_check_logs: [{ id: "c1", note: "træt" }],
      },
      omitted: ["mental_safety_alerts"],
    });
    expect(payload.member).toEqual({ id: "m1" });
    expect(payload.journal_entries).toEqual([{ id: "j1", body: "hej" }]);
    expect(payload.mind_check_logs).toEqual([{ id: "c1", note: "træt" }]);
    expect(payload.hrv_readings).toEqual([]);
    expect(payload.omitted).toEqual(["mental_safety_alerts"]);
  });

  it("does not inject a completeness slogan", () => {
    const payload = buildExportPayload({
      exportedAt: "2026-08-31T00:00:00.000Z",
      mode: "connected",
      note: "Dine egne medlemsrækker vi kan læse under dit login (RLS).",
      member: null,
    });
    expect(isCompletenessSlogan(payload.note)).toBe(false);
  });
});

describe("isCompletenessSlogan", () => {
  it("flags the old export notes", () => {
    expect(
      isCompletenessSlogan("Indeholder alt vi gemmer der er dit."),
    ).toBe(true);
    expect(
      isCompletenessSlogan("Contains everything we store that is yours."),
    ).toBe(true);
  });

  it("allows an honest own-rows note", () => {
    expect(
      isCompletenessSlogan(
        "Indeholder dine egne medlemsrækker vi kan læse under dit login (RLS).",
      ),
    ).toBe(false);
  });

  it("Settings da+en export notes stay honest", () => {
    expect(isCompletenessSlogan(daSettings.data.exportNoteConnected)).toBe(
      false,
    );
    expect(isCompletenessSlogan(daSettings.data.exportNoteDemo)).toBe(false);
    expect(isCompletenessSlogan(enSettings.data.exportNoteConnected)).toBe(
      false,
    );
    expect(isCompletenessSlogan(enSettings.data.exportNoteDemo)).toBe(false);
    expect(isCompletenessSlogan(daSettings.data.title)).toBe(false);
    expect(isCompletenessSlogan(enSettings.data.title)).toBe(false);
  });
});

describe("redactWearableConnection", () => {
  it("strips access and refresh tokens, keeps metadata", () => {
    const redacted = redactWearableConnection({
      id: "c1",
      provider: "whoop",
      status: "revoked",
      access_token: "cipher",
      refresh_token: "cipher2",
    });
    expect(redacted).toEqual({
      id: "c1",
      provider: "whoop",
      status: "revoked",
    });
    expect(redacted).not.toHaveProperty("access_token");
    expect(redacted).not.toHaveProperty("refresh_token");
  });
});

describe("redactPushSubscription", () => {
  it("strips Web Push keys, keeps endpoint metadata", () => {
    const redacted = redactPushSubscription({
      id: "p1",
      endpoint: "https://push.example/x",
      p256dh: "secret",
      auth: "secret2",
    });
    expect(redacted).toEqual({
      id: "p1",
      endpoint: "https://push.example/x",
    });
    expect(redacted).not.toHaveProperty("p256dh");
    expect(redacted).not.toHaveProperty("auth");
  });
});
