import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { ASK_HQ_MAX_TOKENS, ASK_HQ_MODEL, FALLBACK, buildSystemPrompt } from "@/lib/marketing/ask-hq/prompt";
import { createLimiter } from "@/lib/marketing/ask-hq/rate-limit";
import { AskRequest } from "@/lib/marketing/ask-hq/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allow = createLimiter();

function json(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

/** Only the site's own pages may call the chat. */
function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

/**
 * "Spørg HQ": the landing's public chat. Answers stream back as plain
 * text. Nothing is stored: the question goes to Anthropic, the answer
 * comes back, and the thread lives only in the visitor's browser.
 */
export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return json(503, "unavailable");
  if (!sameOrigin(req)) return json(403, "forbidden");

  const visitor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
  if (!allow(visitor)) return json(429, "limited");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, "invalid");
  }
  const parsed = AskRequest.safeParse(body);
  if (!parsed.success) return json(400, "invalid");
  const { locale, messages } = parsed.data;

  const client = new Anthropic();
  const stream = client.messages.stream({
    model: ASK_HQ_MODEL,
    max_tokens: ASK_HQ_MAX_TOKENS,
    system: [{ type: "text", text: buildSystemPrompt(locale), cache_control: { type: "ephemeral" } }],
    messages,
  });

  const encoder = new TextEncoder();
  const body$ = new ReadableStream<Uint8Array>({
    async start(controller) {
      let sent = false;
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            sent = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        // The question itself is never logged: it is the visitor's own text.
        console.error("ask-hq: stream failed", err instanceof Error ? err.message : err);
        controller.enqueue(encoder.encode(sent ? `\n\n${FALLBACK[locale]}` : FALLBACK[locale]));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body$, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
