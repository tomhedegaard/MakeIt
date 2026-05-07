/**
 * Claude-powered program generator.
 *
 * Plug-in to generateProgram(): when ANTHROPIC_API_KEY is set we call
 * Sonnet 4.6 with a structured-output schema. The system prompt is
 * cached (ephemeral) so onboarding waves of new members share the
 * cached prefix and read at ~0.1x cost.
 *
 * Returns null on any failure so the rule-based generator can take over.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type {
  GeneratedSession,
  ProfileInput,
} from "./program-generator";

/* ---------------------------------------------------------------- *
 * Output schema (Zod) — mirrors the GeneratedSession TS type.
 * Numerical constraints are auto-stripped from the schema sent to
 * the API; Zod still validates client-side.
 * ---------------------------------------------------------------- */

const SetSchema = z.object({
  reps: z.number().int().min(1).max(50),
  weight: z.number().min(0).max(500),
  rpe: z.number().min(5).max(10).nullable(),
  restSec: z.number().int().min(0).max(600),
});

const ExerciseSchema = z.object({
  name: z.string().min(2).max(80),
  cue: z.string().min(5).max(280),
  sets: z.array(SetSchema).min(1).max(10),
});

const SessionSchema = z.object({
  dayLabel: z.string().min(2).max(60),
  title: z.string().min(2).max(120),
  estimatedMinutes: z.number().int().min(20).max(180),
  scheduledOffsetDays: z.number().int().min(0).max(6),
  exercises: z.array(ExerciseSchema).min(2).max(8),
});

const ProgramSchema = z.object({
  programCode: z.enum(["STR-12", "HYP-08", "PWR-10", "DL-06"]),
  programName: z.enum([
    "PR-Block",
    "Build Phase",
    "Powerbuilding",
    "Deadlift Specialization",
  ]),
  sessions: z.array(SessionSchema).min(2).max(5),
});

type ProgramOutput = z.infer<typeof ProgramSchema>;

/* ---------------------------------------------------------------- *
 * System prompt (frozen — cacheable prefix)
 * ---------------------------------------------------------------- */

const SYSTEM_PROMPT = `Du er head coach for MakeIt // HQ — en dansk styrketrænings-platform
bygget på 100% danske StrapIt løftestropper. Din opgave er at designe
første uge af et personaliseret 12-ugers mesocyklus for ét enkelt
medlem, baseret på deres profil.

# Output

Du skal kalde submit_program tool'et med en struktureret JSON-payload
der matcher schemaet. Skriv ALDRIG prosa-svar. Validering er striks.

## Felter

- programCode + programName (skal matche målet — se mapping nedenfor)
- sessions: 3-4 sessioner for første uge
  - dayLabel: kort etiket (fx "Dag A — Squat", "Dag B — Bench")
  - title: én linje der beskriver dagens fokus (dansk)
  - estimatedMinutes: realistisk skøn (typisk 45-75)
  - scheduledOffsetDays: dage fra "i dag" (Mon/Tue/Thu/Fri = 0/1/3/4 for 4-dages, 0/2/4 for 3-dages)
  - exercises: 3-5 øvelser pr. session
    - name: standardiseret øvelsesnavn (engelsk OK — "Back Squat", "Romanian Deadlift")
    - cue: 1-2 sætninger på dansk, direkte og handlingsorienteret
    - sets: 3-7 sæt, første sæt opvarmning ved tunge løft

# Programmerings-principper

## Intensitet (% af 1RM)

- **Strength** (goal_focus = strength | hybrid | squat_spec | bench_spec | deadlift_spec):
  Top set: 80-88%, RPE 7-9
  Backoff: 65-75%, ingen RPE-target
  Reps: 3-5 på top, 5 på backoff

- **Hypertrofi** (goal_focus = hypertrophy):
  Hovedløft: 65-75%, 8-12 reps, ingen RPE-target
  Accessory: 60-70%, 10-15 reps
  Kortere hvile (90-120s vs 180-240s)

## Begynder-tilpasning

experienceLevel = "beginner":
- Cap top-set RPE på 7 (aldrig 8+)
- Reducér intensiteter med 5%
- Bevæg-mønstre frem for tunge belastninger

## Udstyr

- "minimal" (kun håndvægte, evt. bænk og stang): undgå rack-baseret squat,
  brug front squat med håndvægte, dumbbell bench, single-leg work
- "home_rack": squat-rack OK, men forventning om mindre udvalg af accessory
- "full": alt OK

## Hvile (restSec)

- Hovedløft strength: 180-240s
- Hovedløft hypertrofi: 90-120s
- Accessory: 60-90s
- Sidste sæt af session: restSec = 0

## Skader

notesInjuries indeholder fritekst på dansk eller engelsk. Læs den nøje:
- "skulder" → undgå behind-the-neck press, OHP måske substitutere med dumbbell press
- "knæ" → undgå dyb squat, brug box squat eller front squat
- "ryg" → undgå konventionel deadlift, brug trap-bar eller RDL

## Mål-mapping

| goal_focus       | programCode | programName               |
|------------------|-------------|---------------------------|
| strength         | STR-12      | PR-Block                  |
| hybrid           | STR-12      | PR-Block                  |
| hypertrophy      | HYP-08      | Build Phase               |
| squat_spec       | STR-12      | PR-Block                  |
| bench_spec       | STR-12      | PR-Block                  |
| deadlift_spec    | DL-06       | Deadlift Specialization   |

# Vægt-rounding

ALLE vægte rundes til **nærmeste 2.5 kg**. Brug kg, ikke lbs.
Hvis 1RM mangler, brug fornuftige defaults baseret på niveau:
- beginner: SQ 80, B 60, DL 100, OHP 40
- intermediate: SQ 120, B 90, DL 140, OHP 55
- advanced: SQ 160, B 110, DL 180, OHP 70

# Cue-stil

Direkte, dansk, handlings-orienteret. Maks 2 sætninger.

Eksempler:
- "Bryst op, knæ ud, sid lavt og driv hårdt op fra hullet."
- "Hofte tilbage, knæ let bøjede, baglår på spænd hele vejen."
- "Pause 1-2 sek med baren rørende brystet før eksplosiv pres."
- "Lats engageret, baren tæt på kroppen, tryk gulvet væk."

ALDRIG generiske cues som "udfør med god form" eller "behold kontrollen".
Vær specifik om kropsdele og fornemmelse.

# Reference-eksempel: Strength, Intermediate, 1RM SQ=120

Dag A — Squat (60 min):
  Back Squat: [{reps:5,weight:60,rpe:null,restSec:120}, {reps:5,weight:80,rpe:null,restSec:180}, {reps:3,weight:95,rpe:null,restSec:180}, {reps:3,weight:102.5,rpe:8,restSec:240}, {reps:5,weight:87.5,rpe:null,restSec:180}, {reps:5,weight:87.5,rpe:null,restSec:0}]
  Romanian Deadlift: 3×8 @ 60kg
  Walking Lunge: 3×10 @ 20kg
  Hanging Knee Raise: 3×12

# Vigtige regler

1. Aldrig RPE 10 i første uge.
2. Den tungeste arbejdssæt er første uges anker — ugevidere bygger derfra.
3. Ingen øvelse over 8 sæt.
4. Sæt-progression skal være logisk (let stigende vægt eller konstant).
5. Sidste øvelse i sessionen er ofte core eller cardio-acc, korte hviler.

Returnér KUN gennem submit_program. Ingen prosa.`;

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export async function generateWithClaude(
  profile: ProfileInput
): Promise<{
  programCode: string;
  programName: string;
  sessions: GeneratedSession[];
} | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const client = new Anthropic({ apiKey });

  // User payload — kept minimal & deterministic so cache hits.
  const userPayload = JSON.stringify(
    {
      goalFocus: profile.goalFocus,
      experienceLevel: profile.experienceLevel,
      weeklyFrequency: profile.weeklyFrequency,
      equipmentLevel: profile.equipmentLevel,
      maxSquatKg: profile.maxSquatKg ?? null,
      maxBenchKg: profile.maxBenchKg ?? null,
      maxDeadliftKg: profile.maxDeadliftKg ?? null,
      maxOhpKg: profile.maxOhpKg ?? null,
      notesInjuries: profile.notesInjuries ?? null,
    },
    null,
    2
  );

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      // Frozen system prompt = cacheable prefix. The same content is
      // sent for every member, so the second request onwards reads
      // from cache (~0.1× cost).
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "Generér ugen baseret på denne medlemsprofil. Returnér via submit_program.\n\n" +
                userPayload,
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(ProgramSchema),
      },
    });

    const out: ProgramOutput | null = response.parsed_output;
    if (!out) return null;

    return shapeOutput(out);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[program-generator-claude] Anthropic API error ${err.status}: ${err.message}`
      );
    } else {
      console.warn("[program-generator-claude] Failed:", err);
    }
    return null;
  }
}

/* ---------------------------------------------------------------- *
 * Internal — convert the LLM output into our internal shape.
 * Currently 1:1 but lets us adjust without changing the schema.
 * ---------------------------------------------------------------- */
function shapeOutput(out: ProgramOutput) {
  return {
    programCode: out.programCode,
    programName: out.programName,
    sessions: out.sessions.map((s) => ({
      dayLabel: s.dayLabel,
      title: s.title,
      estimatedMinutes: s.estimatedMinutes,
      scheduledOffsetDays: s.scheduledOffsetDays,
      exercises: s.exercises.map((ex) => ({
        name: ex.name,
        cue: ex.cue,
        sets: ex.sets.map((set) => ({
          reps: set.reps,
          weight: roundTo25(set.weight),
          rpe: set.rpe,
          restSec: set.restSec,
        })),
      })),
    })),
  };
}

function roundTo25(n: number) {
  return Math.round(n / 2.5) * 2.5;
}
