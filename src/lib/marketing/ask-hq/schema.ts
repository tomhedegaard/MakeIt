import { z } from "zod";

export const MAX_QUESTION_CHARS = 600;
export const MAX_TURNS = 8;

const turn = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

/**
 * A chat request: the last few turns, ending on the visitor's question.
 * Turns must alternate, starting and ending with the visitor, so a
 * client cannot put words in the assistant's mouth mid-thread.
 */
export const AskRequest = z
  .object({
    locale: z.enum(["da", "en"]).default("da"),
    messages: z.array(turn).min(1).max(MAX_TURNS * 2 - 1),
  })
  .refine((r) => r.messages.every((m, i) => m.role === (i % 2 === 0 ? "user" : "assistant")), {
    message: "turns must alternate, starting with the visitor",
  })
  .refine((r) => r.messages.at(-1)?.role === "user", { message: "must end on a question" })
  .refine((r) => r.messages.every((m) => m.role !== "user" || m.content.length <= MAX_QUESTION_CHARS), {
    message: "question too long",
  });

export type AskRequest = z.infer<typeof AskRequest>;
