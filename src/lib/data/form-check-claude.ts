/**
 * Claude vision-powered form-check.
 *
 * Takes 3-4 keyframes from a lifting video and produces a structured
 * verdict (score, headline, positives, negatives, coach-tip).
 *
 * Plug-in pattern: when ANTHROPIC_API_KEY is missing or the call fails,
 * returns null so the caller can fall back to a canned mock.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

/* ---------------------------------------------------------------- *
 * Output schema
 * ---------------------------------------------------------------- */

const VerdictSchema = z.object({
  score: z.number().int().min(0).max(100),
  headline: z.string().min(5).max(140),
  pos: z.array(z.string().min(3).max(180)).min(1).max(4),
  neg: z.array(z.string().min(3).max(180)).min(0).max(4),
  fix: z.string().min(10).max(280),
  detectedExercise: z.string().min(2).max(80).nullable(),
});

export type AIVerdict = z.infer<typeof VerdictSchema>;

/* ---------------------------------------------------------------- *
 * System prompt — frozen, cacheable
 * ---------------------------------------------------------------- */

const SYSTEM_PROMPT = `Du er head coach for MakeIt // HQ — en dansk styrketrænings-platform.
Et medlem har uploaded video af et arbejdssæt. Du modtager 3-4 keyframes
(start, mellemste position, slutning) i kronologisk rækkefølge.

Din opgave er at give en kort, præcis form-vurdering på dansk.

# Output

Returnér KUN via submit_verdict tool'et. Ingen prosa-svar.

## Felter

- score (0-100): samlet teknisk kvalitet
  - 90+ = kompetition-niveau, ingen synlige fejl
  - 80-89 = solidt arbejde, mindre justeringer mulige
  - 70-79 = brugbart, men 1-2 specifikke ting at stramme op
  - 60-69 = klare tekniske problemer, justering nødvendig før mere vægt
  - <60 = grundlæggende mønster mangler, gå ned i vægt

- headline (én sætning, dansk): hovedkonklusion. Vær specifik.
  ✓ "Solid squat — let knæ-valgus i hullet"
  ✗ "Ser fint ud, fortsæt det gode arbejde"

- pos (1-4 punkter): hvad blev gjort godt. Konkret, ikke generisk.
  ✓ "Bardepth ramt — hofte under knæ på alle reps"
  ✗ "God form" / "Solidt sæt"

- neg (0-4 punkter): områder at forbedre. Vær specifik om kropsdel og fase.
  ✓ "Højre knæ kollapser indad i bunden af 2. rep"
  ✗ "Form bryder sammen til sidst"

- fix (1-2 sætninger): den ENE vigtigste justering, formuleret som handling.
  ✓ "Driv knæene aktivt udad i bunden — \"spread the floor\". Hold 1 sek pause næste sæt."
  ✗ "Arbejd på din form generelt"

- detectedExercise: hvis du kan identificere øvelsen fra videoen, navngiv den
  (engelsk OK: "Back Squat", "Conventional Deadlift", "Paused Bench"). Brug
  null hvis du ikke kan se det tydeligt.

# Vurderings-principper

## Squat
- Dybde: hofte under knæ ved bunden
- Bar-path: lige over midtfod, ingen drift fremad
- Knæ-tracking: knæ i samme retning som tæer, ikke kollaps indad
- Torso-vinkel: forbliver konsistent gennem rep

## Bench
- Bar-path: ned til midten af brystet (ikke hals, ikke mave)
- Skulderblade: trukket sammen og ned hele sættet
- Ben: faste i gulvet, ingen pumping
- Lockout: fuld armekstension uden overekstension

## Deadlift
- Setup: skulderblade over baren, lats engageret
- Hofte: stiger samtidig med skuldre (ingen "stripper hofte")
- Bar-kontakt: tæt på kroppen hele vejen op
- Lockout: stå op, ingen hyperekstension

## OHP / Push Press
- Bar over midtfod ved lockout
- Albuer let foran baren under press
- Ingen overdreven læn-tilbage
- Push press = brug ben-drev, ikke kun skuldre

# Vigtige regler

1. Du kommenterer KUN på det du faktisk kan se i frames'ne. Hvis kameravinklen skjuler noget, skriv det i headline ("svært at vurdere knæ-tracking pga. kamera fra siden").

2. Hvis videoen viser noget farligt (rund ryg ved tunge løft, knæ kollapser totalt), prioritér sikkerhed i fix-feltet.

3. Score skal være retfærdig — ikke generisk høj for opmuntring. Atleter ønsker ærlig feedback.

4. ALDRIG generiske sætninger som "fortsæt det gode arbejde", "godt sæt", "se min anden feedback".

5. Hvis frames er sløret, tomme, eller viser ikke en løfteøvelse: returnér score=0, headline="Kunne ikke vurdere — videoen viser ikke et tydeligt løft", og forklar i fix hvad medlemmet skal gøre anderledes.

Returnér KUN via submit_verdict.`;

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export async function analyzeWithClaude(
  frames: string[],
  exerciseName?: string
): Promise<AIVerdict | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!frames || frames.length === 0) return null;

  const client = new Anthropic({ apiKey });

  // Convert each data URL → Anthropic image block.
  const imageBlocks = frames.map((dataUrl) => {
    const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Invalid frame data URL");
    }
    const [, mediaType, b64] = match;
    return {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        data: b64,
      },
    };
  });

  const exerciseHint = exerciseName
    ? `Medlemmet siger øvelsen er: ${exerciseName}. Verificér at videoen viser denne øvelse.`
    : "Medlemmet har ikke angivet øvelse — identificér den selv hvis du kan.";

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      // System prompt cached — every form-check shares the same prefix.
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
              text: `${exerciseHint}\n\n${frames.length} keyframes følger i kronologisk rækkefølge:`,
            },
            ...imageBlocks,
            {
              type: "text",
              text: "Returnér din vurdering via submit_verdict.",
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(VerdictSchema),
      },
    });

    return response.parsed_output ?? null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[form-check-claude] Anthropic API error ${err.status}: ${err.message}`
      );
    } else {
      console.warn("[form-check-claude] Failed:", err);
    }
    return null;
  }
}
