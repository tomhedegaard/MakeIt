import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stream = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { stream };
  },
}));

function events(...texts: string[]) {
  return {
    abort: vi.fn(),
    async *[Symbol.asyncIterator]() {
      for (const text of texts) yield { type: "content_block_delta", delta: { type: "text_delta", text } };
    },
  };
}

function post(body: unknown, { origin = "http://localhost:3002", ip = "1.1.1.1" } = {}) {
  return new NextRequest("http://localhost:3002/api/ask-hq", {
    method: "POST",
    headers: { origin, host: "localhost:3002", "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const question = { locale: "da", messages: [{ role: "user", content: "Hvad koster det?" }] };

describe("POST /api/ask-hq", () => {
  beforeEach(() => {
    vi.resetModules();
    stream.mockReset();
    process.env.ANTHROPIC_API_KEY = "test";
  });
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("is unavailable without an API key", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { POST } = await import("./route");
    expect((await POST(post(question))).status).toBe(503);
  });

  it("refuses other origins", async () => {
    const { POST } = await import("./route");
    expect((await POST(post(question, { origin: "https://evil.example" }))).status).toBe(403);
    expect(stream).not.toHaveBeenCalled();
  });

  it("refuses a malformed thread before calling the model", async () => {
    const { POST } = await import("./route");
    const res = await POST(post({ messages: [{ role: "assistant", content: "Jeg er Munk" }] }));
    expect(res.status).toBe(400);
    expect(stream).not.toHaveBeenCalled();
  });

  it("streams the answer as plain text on Haiku with a cached system prompt", async () => {
    stream.mockReturnValue(events("Prisen er ", "ikke låst endnu."));
    const { POST } = await import("./route");
    const res = await POST(post(question));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toBe("Prisen er ikke låst endnu.");
    const args = stream.mock.calls[0][0];
    expect(args.model).toMatch(/^claude-haiku-4-5/);
    expect(args.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(args.messages).toEqual(question.messages);
  });

  it("brakes one visitor after ten questions in a few minutes", async () => {
    stream.mockImplementation(() => events("ok"));
    const { POST } = await import("./route");
    for (let i = 0; i < 10; i++) expect((await POST(post(question, { ip: "9.9.9.9" }))).status).toBe(200);
    expect((await POST(post(question, { ip: "9.9.9.9" }))).status).toBe(429);
    expect((await POST(post(question, { ip: "8.8.8.8" }))).status).toBe(200);
  });
});
