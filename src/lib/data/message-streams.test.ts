import { describe, expect, it } from "vitest";
import {
  demoDualStream,
  splitByStream,
  streamFor,
  type StreamMessage,
} from "./message-streams";

const NOW = new Date("2026-09-03T08:00:00.000Z");

describe("message-streams", () => {
  it("attributes Munk craft vs Motor @propose without collapsing", () => {
    expect(
      streamFor({
        senderHandle: "Munk",
        body: "Knæ ud i hullet.",
      }),
    ).toBe("munk");
    expect(
      streamFor({
        senderHandle: "Motor",
        body: "@foreslår: let topsæt",
        propose: true,
      }),
    ).toBe("motor");
    expect(
      streamFor({
        senderHandle: "nina_dl",
        body: "@propose: deload",
      }),
    ).toBe("motor");
  });

  it("demo dual stream keeps two histories", () => {
    const { munk, motor } = demoDualStream(NOW);
    expect(munk.length).toBeGreaterThanOrEqual(1);
    expect(motor.length).toBeGreaterThanOrEqual(1);
    expect(munk.every((m) => m.stream === "munk")).toBe(true);
    expect(motor.every((m) => m.stream === "motor")).toBe(true);
    expect(motor.every((m) => m.propose === true)).toBe(true);
    expect(munk.some((m) => m.kind === "audio")).toBe(true);
    expect(munk.some((m) => m.senderHandle === "Munk")).toBe(true);
    expect(motor.some((m) => (m.body ?? "").startsWith("@foreslår"))).toBe(true);

    const mixed: StreamMessage[] = [...munk, ...motor];
    const split = splitByStream(mixed);
    expect(split.munk.map((m) => m.id)).toEqual(munk.map((m) => m.id));
    expect(split.motor.map((m) => m.id)).toEqual(motor.map((m) => m.id));
  });
});
