/**
 * Mock data for demo mode (no Supabase env). Used by every /mind
 * surface so the experience is fully clickable without backend.
 *
 * Deterministic: same date → same output. Avoids the dev-server
 * flicker that random seeds cause.
 */

import type {
  MentalSession,
  MentalSessionCategory,
  MentalSessionVisualPattern,
  MentalSettings,
  MentalSignal,
  MindCheckLog,
} from "./types";
import { DEFAULT_MENTAL_SETTINGS } from "./types";

const MOCK_MEMBER_ID = "mock-munk";

/** Stable PRNG: same seed → same sequence. */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function isoDateDaysAgo(daysAgo: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoTimestampDaysAgo(daysAgo: number, hour = 8): string {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString();
}

/**
 * 30 days of plausible mind-check logs for the mock member.
 * Patterns: realistic week-rhythm (weekend energy higher),
 * a dip in stress mid-period to make the graph readable.
 */
export function mockMindCheckLogs(days = 30): MindCheckLog[] {
  const rand = seededRand(2026_06_07);
  const out: MindCheckLog[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = isoDateDaysAgo(i);
    const dow = new Date(date).getUTCDay(); // 0 = Sun
    const weekend = dow === 0 || dow === 6;
    // Base ranges with weekly modulation
    const energy = clamp1to5(weekend ? 4 : 3, rand);
    const stress = clamp1to5(
      // mid-period dip in stress (better) around day 12-18
      i > 11 && i < 19 ? 2 : 3,
      rand,
    );
    const focus = clamp1to5(weekend ? 3 : 4, rand);
    out.push({
      id: `mock-mc-${i}`,
      member_id: MOCK_MEMBER_ID,
      logged_at: isoTimestampDaysAgo(i),
      logged_date: date,
      energy,
      stress,
      focus,
      note: i === 0 ? "Lidt træt — sov dårligt." : null,
      source: i % 5 === 0 ? "evening_nudge" : "manual",
      created_at: isoTimestampDaysAgo(i),
    });
  }
  return out;
}

function clamp1to5(base: number, rand: () => number): number {
  const jitter = Math.floor(rand() * 3) - 1; // -1, 0, +1
  const v = base + jitter;
  return Math.max(1, Math.min(5, v));
}

/** Derive the same MentalSignal shape Adaptive Engine consumes. */
export function mockMentalSignal(): MentalSignal {
  const logs = mockMindCheckLogs(7);
  const med = (arr: number[]) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)] ?? null;
  };
  return {
    energy_median_7d: med(logs.map((l) => l.energy)),
    stress_median_7d: med(logs.map((l) => l.stress)),
    focus_median_7d: med(logs.map((l) => l.focus)),
    low_for_days: 0,
    freshness_days: 0,
  };
}

export function mockMentalSettings(): MentalSettings {
  return {
    member_id: MOCK_MEMBER_ID,
    ...DEFAULT_MENTAL_SETTINGS,
    last_mind_check_at: isoTimestampDaysAgo(0),
    current_streak_days: 12,
    longest_streak_days: 18,
    created_at: isoTimestampDaysAgo(40),
    updated_at: isoTimestampDaysAgo(0),
  };
}

type HeroSeed = {
  slug: string;
  category: MentalSessionCategory;
  title: string;
  subtitle: string;
  duration_seconds: number;
  visual_pattern: MentalSessionVisualPattern;
  body_md: string;
};

const POLISHED_COHERENCE = `## Hvad du laver

Du trækker vejret i et tempo der maksimerer din HRV. Det er ikke åndedrag for hyggens skyld — det er træning af nervesystemet, samme princip som styrketræning.

5 sekunder ind. 5 sekunder ud. Ca. 6 åndedrag pr. minut. Følg den lange ring på skærmen.

## Det første minut

Det er svært. Din vejrtrækning vil snyde dig — gå hurtigere, eller blive korthugget. Lad det være. Ringen trækker dig.

## Det andet minut

Du vil bemærke at dine skuldre allerede er sunket. Det er målet. Den parasympatiske nerve har overtaget. Kroppen siger: ingen fare.

Hvis tanker kommer, lad dem passere. Tilbage til ringen.

## Det tredje og fjerde minut

Nu føles det nemt. Det er sjældent du får et signal fra kroppen om at noget rent fysisk virker. Det her er et af dem.

## Når du er færdig

Lav mind-check bagefter hvis du har lyst. Mange ser stress falde et eller to trin.`;

const POLISHED_PRIMING = `## Lige nu

Du er minutter fra at træne. Det er nu hovedet skal vælge hvad det er for en session.

Ingen taler om det her. De fleste går direkte til vægten og håber. Du gør det modsatte.

## Tre spørgsmål

1. **Hvad er den vigtigste sæt i dag?** Den ene sæt der gør dagen til en god dag uanset hvad der ellers sker.

2. **Hvad er den ene cue jeg holder fokus på?** Knæ ud. Hoften løfter. Vælg én. Hvis du vælger tre, vælger du ingen.

3. **Hvad er signalet fra min krop?** Står du flygtigt? Mangler du varme i hofterne? Føles ryggen kort? Det er gratis information. Brug den i opvarmningen.

## Sidste 30 sekunder

Luk øjnene. Se din vigtigste sæt. Vægten letter. Du står oprejst. Du sætter den ned.

Du står stadig oprejst.

Åbn øjnene. Gå.`;

const POLISHED_WIND_DOWN = `## Hvor du er nu

Du har lige skubbet hårdt. Pulsen er nede igen, men nervesystemet er stadig oppe. Det skal det være lige efter en hård session — men hvis du vil sove i nat, vil du have det ned før du går i seng.

Det her tager 4 minutter og er det stærkeste værktøj du har til søvn efter sen træning.

## Mønstret

4 sekunder ind. 8 sekunder ud. Den lange udånding er pointet. Den fortæller hjernen: faren er væk.

## I de første to minutter

De første otte sekunders udånding er svære. Kroppen vil have luft hurtigere. Lad være med at tvinge — gå langsommere og længere ud hver gang.

## I de sidste to minutter

Nu er det blevet nemt. Du er kommet ned.

Ingen telefon når du går herfra. Drik et glas vand. Læs noget på papir. Eller bare sid.`;

const POLISHED_BOX_BREATH = `## Sæt dig op

Fødderne i gulvet. Skulderne ned. Du behøver ikke lukke øjnene — det her er ikke meditation, det er teknik.

## Mønstret

4 sekunder ind. 4 hold. 4 ud. 4 hold. Gentag. Følg ringen.

## I 3 minutter

Den anden runde er nemmere end den første. Det er pointet — kroppen får signalet om at det her er sikkert.

Tanker kommer. Lad dem passere. Tilbage til vejret.

## Når du er færdig

To stille minutter mere. Det her er det mest pålidelige værktøj du har til at skifte mode på krævelse.`;

const POLISHED_RESTART = `## Du har fået en pause

Træningen, arbejde, livet — du var væk. Nu skal du tilbage. Ikke ved at presse hårdere. Ved at vælge ÉN ting.

## I 90 sekunder

Hvad er den ene ting du vil have lavet før du går i seng i aften? Det første spontane svar er som regel det rigtige.

## I 90 sekunder mere

Hvor starter du? Det første konkrete skridt — ikke "begynd", men noget du fysisk gør.

Når alarmen ringer: gå direkte til det skridt. Ingen tilbagekig.`;

const POLISHED_SLEEP_SCAN = `## Mens du lægger dig

Læg dig på ryggen. Tæppet over. Lyset slukket. Telefonen i et andet rum.

## Scan ovenfra

Isse. Pande. Øjenlåg — tunge. Mund — afslappet kæbe. For hvert område: mærk det, ånd ud, slip det.

## Ned gennem kroppen

Nakke. Skuldre — lad dem falde mod gulvet. Bryst. Mave. Hofter. Lår — slap helt af. Knæ. Læg. Fødder.

## Hele kroppen samtidig

Den er tung. Sengen bærer den. Tanker om i morgen kommer — send dem videre.

Hvis du falder i søvn under scanningen, godt. Det er målet.`;

const POLISHED_DEBRIEF_GOOD = `## Stop op

Du er lige færdig. 2 minutter inden du går videre. De fleste gode sessioner ryger ud af kroppen igen fordi vi ikke ankrer dem.

## Hvad virkede?

Én ting. Helt konkret. Opvarmning? Cue? Tempo? Mindset? Vælg den én.

## Hvorfor virkede det?

Du havde gjort noget anderledes. Hvad var det?

## Næste gang

Hvordan får du den samme ting med igen? Skriv det evt. ned i journalen med to ord.

Du vil takke dig selv om en måned.`;

const POLISHED_DEBRIEF_BAD = `## Det var skidt

Fair. Det sker. Vi taler om hvad du gør med det inden du går herfra.

Ingen quick fix. Bare en kort, ærlig samtale med dig selv.

## Hvad var virkelig galt?

Var det vægten? Eller var det dig? Søvn? Energi? Stress udefra? Tanker du har slæbt med dig?

Vær ærlig. Det er kun dig der hører dette.

## Hvad bærer du IKKE med dig?

Én ting du nægter at lade ramme i morgen. Lad det blive her, på dette gulv.

## Hvad lærte du?

Én lille ting. "Næste gang…" — fyld ud.

Måske er det noget med at logge mind-check INDEN næste session — så Adaptive Engine kan justere før du står med stangen i hånden.

## Sidste ting

Skriv det evt. ned i journalen. To linjer. Du vil takke dig selv om en måned.

Gå. Ingen tilbagekig.`;

const HERO_SEEDS: HeroSeed[] = [
  { slug: "box-breath-4-4-4-4-da", category: "breathing", title: "Box breath 4-4-4-4", subtitle: "For indre ro — 3 min", duration_seconds: 180, visual_pattern: "box_breath_4_4_4_4", body_md: POLISHED_BOX_BREATH },
  { slug: "coherence-5-5-da", category: "breathing", title: "Coherence 5-5", subtitle: "For HRV-løft — 4 min", duration_seconds: 240, visual_pattern: "coherence_5_5", body_md: POLISHED_COHERENCE },
  { slug: "pre-session-priming-da", category: "focus", title: "Pre-session priming", subtitle: "90 sekunder inden du tager fat", duration_seconds: 90, visual_pattern: "still_focus", body_md: POLISHED_PRIMING },
  { slug: "restart-from-brain-fog-da", category: "focus", title: "Genstart efter pause", subtitle: "Fra hjerne-tåge til klart sigte — 3 min", duration_seconds: 180, visual_pattern: "still_focus", body_md: POLISHED_RESTART },
  { slug: "wind-down-beast-mode-da", category: "recovery", title: "Vind ned efter beast-mode", subtitle: "Skift fra på til af — 4 min", duration_seconds: 240, visual_pattern: "wave_4_8", body_md: POLISHED_WIND_DOWN },
  { slug: "sleep-body-scan-da", category: "recovery", title: "Sov bedre — body scan", subtitle: "Til sengetid — 5 min", duration_seconds: 300, visual_pattern: "none", body_md: POLISHED_SLEEP_SCAN },
  { slug: "debrief-what-worked-da", category: "debrief", title: "Hvad gik godt? Hvad næste gang?", subtitle: "Efter en god session — 2 min", duration_seconds: 120, visual_pattern: "still_focus", body_md: POLISHED_DEBRIEF_GOOD },
  { slug: "debrief-bad-session-da", category: "debrief", title: "Når træningen var dårlig", subtitle: "Lige efter en lortesession — 3 min", duration_seconds: 180, visual_pattern: "still_focus", body_md: POLISHED_DEBRIEF_BAD },
];

/** 8 hero sessions matching the seed in migration 0046. */
export function mockHeroSessions(): MentalSession[] {
  return HERO_SEEDS.map((s, i) => ({
    id: `mock-mental-session-${i}`,
    slug: s.slug,
    category: s.category,
    title: s.title,
    subtitle: s.subtitle,
    duration_seconds: s.duration_seconds,
    body_md: s.body_md,
    visual_pattern: s.visual_pattern,
    audio_url: null,
    voice: null,
    generated_by: "claude",
    prompt_seed: null,
    locale: "da",
    is_hero: true,
    published_at: isoTimestampDaysAgo(30),
    created_at: isoTimestampDaysAgo(30),
  }));
}
