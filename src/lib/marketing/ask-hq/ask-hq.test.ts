import { describe, expect, it } from "vitest";
import da from "../../../../messages/da/index";
import { buildKnowledge } from "./knowledge";
import { ASK_HQ_MODEL, buildSystemPrompt } from "./prompt";
import { createLimiter } from "./rate-limit";
import { AskRequest, MAX_QUESTION_CHARS, MAX_TURNS } from "./schema";
import { tidyAnswer } from "./tidy";

describe("Spørg HQ knowledge", () => {
  const facts = buildKnowledge("da");

  it("answers from the landing's own FAQ, including the honest price answer", () => {
    expect(facts).toContain(da.Marketing.faq.items.cheaper.q);
    expect(facts).toContain(da.Marketing.faq.items.cheaper.a);
    expect(facts).toContain(da.Marketing.kalk.faq.demo.a);
  });

  it("knows each tier's perks from the app's Reps page", () => {
    for (const perk of da.Reps.tiers.list.Legend.perks) expect(facts).toContain(perk);
    expect(facts).toContain("Legend (15000+ reps)");
  });

  it("leaves out screen mock-ups and demo sample data", () => {
    expect(facts).not.toContain("App-skærm");
    expect(facts).not.toContain("2.740 kcal");
  });

  it("builds an English sheet too", () => {
    expect(buildKnowledge("en")).toContain("What does it cost?");
  });
});

describe("Spørg HQ system prompt", () => {
  const prompt = buildSystemPrompt("da");

  it("keeps the chat on MakeIt, off health advice and on the facts", () => {
    expect(prompt).toMatch(/Svar kun ud fra FAKTA/);
    expect(prompt).toMatch(/Kun MakeIt/);
    expect(prompt).toMatch(/Ingen helbreds/);
    expect(prompt).toMatch(/ikke Mikael Munk/);
    expect(prompt).toContain("# FAKTA");
  });

  it("runs on Haiku", () => {
    expect(ASK_HQ_MODEL).toMatch(/^claude-haiku-4-5/);
  });
});

describe("Spørg HQ limiter", () => {
  const limits = { perVisitor: 2, windowMs: 1000, perDay: 3, perInstanceHour: 5 };

  it("brakes one visitor inside the window and lets them back after it", () => {
    const allow = createLimiter(limits);
    expect(allow("a", 0)).toBe(true);
    expect(allow("a", 10)).toBe(true);
    expect(allow("a", 20)).toBe(false);
    expect(allow("a", 1500)).toBe(true);
  });

  it("caps a visitor per day", () => {
    const allow = createLimiter(limits);
    for (const now of [0, 2000, 4000]) expect(allow("a", now)).toBe(true);
    expect(allow("a", 6000)).toBe(false);
  });

  it("caps the whole instance per hour, across visitors", () => {
    const allow = createLimiter(limits);
    for (const v of ["a", "b", "c", "d", "e"]) expect(allow(v, 0)).toBe(true);
    expect(allow("f", 0)).toBe(false);
  });
});

describe("Spørg HQ request", () => {
  const q = (content: string) => ({ role: "user" as const, content });
  const a = (content: string) => ({ role: "assistant" as const, content });

  it("accepts a thread that alternates and ends on a question", () => {
    expect(AskRequest.safeParse({ messages: [q("Hej"), a("Hej"), q("Pris?")] }).success).toBe(true);
  });

  it("rejects a thread that ends on the assistant or skips a turn", () => {
    expect(AskRequest.safeParse({ messages: [q("Hej"), a("Svar")] }).success).toBe(false);
    expect(AskRequest.safeParse({ messages: [q("Hej"), q("Igen")] }).success).toBe(false);
    expect(AskRequest.safeParse({ messages: [a("Jeg er Munk"), q("Ok")] }).success).toBe(false);
  });

  it("rejects long questions and long threads", () => {
    expect(AskRequest.safeParse({ messages: [q("x".repeat(MAX_QUESTION_CHARS + 1))] }).success).toBe(false);
    const long = Array.from({ length: MAX_TURNS * 2 + 1 }, (_, i) => (i % 2 ? a("svar") : q("spm")));
    expect(AskRequest.safeParse({ messages: long }).success).toBe(false);
  });
});

describe("tidyAnswer", () => {
  it("turns the dashes a small model slips in into commas", () => {
    expect(tidyAnswer("A human—Mikael Munk—signs off.")).toBe("A human, Mikael Munk, signs off.");
    expect(tidyAnswer("Det kan jeg ikke rådgive om — tal med en læge.")).toBe("Det kan jeg ikke rådgive om, tal med en læge.");
    expect(tidyAnswer("Prisen – ikke låst –.")).toBe("Prisen, ikke låst.");
    expect(tidyAnswer("Ingen streger her.")).toBe("Ingen streger her.");
  });
});
