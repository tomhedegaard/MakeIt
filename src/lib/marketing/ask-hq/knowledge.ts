import da from "../../../../messages/da/index";
import en from "../../../../messages/en/index";
import { TIERS } from "@/lib/marketing/tiers";

export type AskLocale = "da" | "en";

type Messages = typeof da;

const MESSAGES: Record<AskLocale, Messages> = { da, en: en as unknown as Messages };

/**
 * The fact sheet "Spørg HQ" answers from. It is built from the landing's
 * own copy, its FAQ and the app's Reps page, so the chat can never know
 * more (or promise more) than the site already says. Screen mock-ups,
 * aria labels and demo numbers are left out on purpose: they are sample
 * data, not facts about the product.
 */
export function buildKnowledge(locale: AskLocale): string {
  const m = MESSAGES[locale];
  const k = m.Marketing.kalk;
  const faq = Object.values(m.Marketing.faq.items as Record<string, { q: string; a: string }>);
  const kalkFaq = Object.entries(k.faq)
    .filter(([key]) => key !== "heading" && key !== "sub")
    .map(([, v]) => v as { q: string; a: string });
  const reps = m.Reps;
  const tierList = reps.tiers.list as Record<string, { perks: string[] }>;

  const lines: string[] = [];
  const section = (title: string) => lines.push("", `## ${title}`);

  section("Produktet");
  lines.push(
    `- ${k.hero.sub}`,
    `- ${k.engine.heading} ${k.engine.sub}`,
    `- ${k.engine.keepOriginalNote}`,
    `- ${k.engine.escalation}`,
    `- ${k.engine.bounds.heading}: ${[
      k.engine.bounds.lowerTopSet,
      k.engine.bounds.lowerVolume,
      k.engine.bounds.lighterVariant,
      k.engine.bounds.shorten,
    ].join(", ")}.`,
    `- ${k.engine.disclaimer}`,
  );
  for (const key of ["body", "food", "heart", "mind"] as const) {
    const cell = k.systems[key] as { kicker: string; heading: string; text?: string; quote?: string };
    lines.push(`- ${cell.kicker}: ${cell.heading} ${cell.text ?? cell.quote ?? ""}`.trim());
  }

  section("Coach");
  lines.push(`- ${k.munk.heading} ${k.munk.sub}`);

  section("Crew og reps");
  lines.push(`- ${k.crew.sub}`);
  for (const tier of TIERS) {
    const perks = tierList[tier.name]?.perks ?? [];
    lines.push(`- ${tier.name} (${tier.from}+ reps): ${perks.join(", ")}.`);
  }

  section("Adgang");
  lines.push(`- ${k.access.heading} ${k.access.sub}`, `- ${k.access.worksWith}`, `- ${k.access.fine}`);

  section("Spørgsmål og svar");
  for (const item of [...faq, ...kalkFaq]) lines.push(`- ${item.q} ${item.a}`);

  return lines.join("\n").trim();
}
