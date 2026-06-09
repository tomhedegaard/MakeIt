/**
 * Deterministic fallback for the daily AI mental coach when Claude
 * is unavailable. Produces a context-aware reflection without ever
 * inventing numbers — only references what's actually in the payload.
 *
 * The fallback ALWAYS uses the three-section structure the renderer
 * expects, so the UI looks consistent regardless of source.
 */

import type { CoachContext } from "./coach-context";

export function buildFallbackCoachOutput(ctx: CoachContext): string {
  const hasToday = ctx.mind_today.energy !== null || ctx.mind_today.stress !== null;
  const hasSignal =
    ctx.mind_signal_7d.energy_median_7d !== null ||
    ctx.mind_signal_7d.stress_median_7d !== null;

  const observation = buildObservation(ctx, hasToday, hasSignal);
  const question = buildQuestion(ctx, hasToday);
  const action = buildAction(ctx, hasToday);

  return [
    "## Det jeg ser hos dig i dag",
    observation,
    "",
    "## Et spørgsmål til dig",
    question,
    "",
    "## En lille ting at gøre i dag",
    action,
  ].join("\n");
}

function buildObservation(
  ctx: CoachContext,
  hasToday: boolean,
  hasSignal: boolean,
): string {
  if (!hasToday && !hasSignal) {
    return "Vi har ikke nok mind-check data endnu — log et i dag, så bygger vi grundlag for at se mønstre.";
  }
  if (hasToday) {
    const e = ctx.mind_today.energy;
    const s = ctx.mind_today.stress;
    const f = ctx.mind_today.focus;
    const bits: string[] = [];
    if (e !== null) bits.push(`energi ${e}/5`);
    if (s !== null) bits.push(`stress ${s}/5`);
    if (f !== null) bits.push(`fokus ${f}/5`);
    return `Dagens mind-check: ${bits.join(" · ")}. Det er hvor du står lige nu — hverken godt eller skidt, bare data.`;
  }
  const days = ctx.mind_signal_7d.low_for_days;
  if (days >= 3) {
    return `Sidste uge har du haft ${days} dage i streg hvor enten energi eller stress har trukket nedad. Det er værd at lægge mærke til.`;
  }
  return "Den seneste uge ligner et stabilt mønster — ingen store udsving.";
}

function buildQuestion(ctx: CoachContext, hasToday: boolean): string {
  if (hasToday && ctx.mind_today.stress !== null && ctx.mind_today.stress >= 4) {
    return "Hvad er den ene ting du kan lade falde i dag, så stressen får luft?";
  }
  if (hasToday && ctx.mind_today.energy !== null && ctx.mind_today.energy <= 2) {
    return "Hvis en god ven sad over for dig nu og vidste hvor træt du er — hvad ville de sige?";
  }
  return "Hvad er den ene ting du gerne vil tage med ud af dagen i aften?";
}

function buildAction(ctx: CoachContext, hasToday: boolean): string {
  if (hasToday && ctx.mind_today.stress !== null && ctx.mind_today.stress >= 4) {
    return "3 minutters coherence 5-5 i Mind-biblioteket — det er det hurtigste skridt mod ro.";
  }
  if (hasToday && ctx.mind_today.energy !== null && ctx.mind_today.energy <= 2) {
    return "Drik et glas vand. Læg dig 5 minutter på sofaen uden telefon. Ingen krav.";
  }
  return "Skriv én sætning i din journal i aften — uanset hvor kort.";
}
