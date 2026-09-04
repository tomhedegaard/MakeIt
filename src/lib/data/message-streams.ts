/**
 * Dual stream — Munk (human craft) vs Motor (Adaptive Engine).
 *
 * Messages and insights must not collapse into one history.
 * Motor may @propose; Munk's thread stays a person with a name.
 */

import type { Message } from "@/lib/data/messages";

export type MessageStream = "munk" | "motor";

export type StreamMessage = Message & {
  stream: MessageStream;
  /** Engine @propose — never a face, never a personality. */
  propose?: boolean;
};

export function streamFor(
  message: Pick<Message, "senderHandle" | "body"> & {
    stream?: MessageStream;
    propose?: boolean;
  },
): MessageStream {
  if (message.stream) return message.stream;
  if (message.propose) return "motor";
  const handle = (message.senderHandle ?? "").toLowerCase();
  if (handle === "motor" || handle === "adaptive") return "motor";
  const body = message.body ?? "";
  if (body.startsWith("@foreslår") || body.startsWith("@propose")) {
    return "motor";
  }
  return "munk";
}

export function splitByStream(messages: StreamMessage[]): {
  munk: StreamMessage[];
  motor: StreamMessage[];
} {
  const munk: StreamMessage[] = [];
  const motor: StreamMessage[] = [];
  for (const m of messages) {
    if (streamFor(m) === "motor") motor.push(m);
    else munk.push(m);
  }
  return { munk, motor };
}

function base(
  partial: Partial<StreamMessage> &
    Pick<StreamMessage, "id" | "senderId" | "senderHandle" | "stream" | "kind">,
  now: Date,
  offsetMin: number,
): StreamMessage {
  return {
    conversationId: "demo-munk",
    senderIsCoach: partial.stream === "munk",
    body: null,
    mediaPath: null,
    mediaMime: null,
    mediaDurationSec: null,
    mediaUrl: null,
    readAt: null,
    createdAt: new Date(now.getTime() - offsetMin * 60 * 1000).toISOString(),
    propose: false,
    ...partial,
  };
}

/** Demo dual stream — visible on /messages without Supabase. */
export function demoDualStream(now = new Date()): {
  munk: StreamMessage[];
  motor: StreamMessage[];
} {
  const munk: StreamMessage[] = [
    base(
      {
        id: "msg-ath-1",
        senderId: "mock-athlete",
        senderHandle: "nina_dl",
        senderIsCoach: false,
        stream: "munk",
        kind: "text",
        body: "Filmede squat sæt 4 — knæene føltes bløde i hullet.",
      },
      now,
      90,
    ),
    base(
      {
        id: "msg-munk-voice",
        senderId: "mock-munk",
        senderHandle: "Munk",
        senderIsCoach: true,
        stream: "munk",
        kind: "audio",
        body: "Knæ ud i hullet. Pause-squat 80% næste gang.",
        mediaUrl: "demo:voice",
        mediaDurationSec: 18,
        mediaPath: "demo:voice",
      },
      now,
      40,
    ),
    base(
      {
        id: "msg-munk-text",
        senderId: "mock-munk",
        senderHandle: "Munk",
        senderIsCoach: true,
        stream: "munk",
        kind: "text",
        body: "Enig med filmen. Hold 1 sek i bunden — så spænder kæden igen.",
      },
      now,
      38,
    ),
  ];

  const motor: StreamMessage[] = [
    base(
      {
        id: "msg-motor-1",
        senderId: "motor",
        senderHandle: "Motor",
        senderIsCoach: false,
        stream: "motor",
        propose: true,
        kind: "text",
        body: "@foreslår: let topsæt på squat i dag — nattens HRV ligger under båndet.",
      },
      now,
      120,
    ),
    base(
      {
        id: "msg-motor-2",
        senderId: "motor",
        senderHandle: "Motor",
        senderIsCoach: false,
        stream: "motor",
        propose: true,
        kind: "text",
        body: "@foreslår: behold original volume. Kun topsæt −10%.",
      },
      now,
      118,
    ),
  ];

  return { munk, motor };
}
