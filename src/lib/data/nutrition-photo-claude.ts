/**
 * Claude multimodal meal-photo grader.
 *
 * Takes a single plate photo + the planned meal (title + ingredients)
 * and returns an adherence score plus a short coach-style note.
 *
 * Plug-in pattern: ANTHROPIC_API_KEY missing or call fails → null,
 * so the action layer skips grading rather than fail the log.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { BRAND_VOICE } from "@/lib/nutrition/brand";

/* ---------------------------------------------------------------- *
 * Output schema
 * ---------------------------------------------------------------- */

const GradeSchema = z.object({
  matchScore: z.number().int().min(0).max(100),
  proteinEstimate: z.enum(["low", "on_target", "high"]),
  aiHeadline: z.string().min(5).max(120),
  aiNotes: z.string().min(10).max(280),
});

export type MealPhotoGrade = z.infer<typeof GradeSchema>;

export type MealPhotoGradeOpts = {
  photoBase64: string;
  mimeType: string;
  plannedTitle: string;
  plannedIngredients: Array<{ name: string }>;
};

/* ---------------------------------------------------------------- *
 * System prompt — frozen, cacheable
 * ---------------------------------------------------------------- */

const SYSTEM_PROMPT = `Du er nutrition-coach for MakeIt // HQ. Et medlem har lige
spist et måltid og uploaded et billede af tallerkenen. Du sammenligner billedet
med det planlagte måltid og giver en kort, ærlig vurdering.

# Brand-stemme

${BRAND_VOICE}

# Output

Returnér KUN via submit_grade tool'et. Ingen prosa-svar.

## Felter

- matchScore (0-100): hvor godt matcher tallerkenen den planlagte ret
  - 90+ = nær-perfekt match: alle hovedingredienser tilstede, portion ligner
  - 75-89 = solidt match: hovedingredienser ok, mindre afvigelser
  - 60-74 = delvist: 1-2 hovedingredienser mangler eller udskiftet
  - 40-59 = noget andet, men stadig på politik (whole foods, ingen UPF synlig)
  - <40 = afviger meget, eller indeholder UPF / dårlige olier

- proteinEstimate: er der nok protein på tallerkenen
  - "low": ingen synlig hovedprotein, eller meget lille portion
  - "on_target": protein-kilden synlig og rimelig portion
  - "high": tydeligt over hvad planen kalder på

- aiHeadline (én sætning, dansk): hovedkonklusion. Vær konkret.
  ✓ "Solid match — kylling, quinoa og grønkål er der"
  ✗ "Ser fint ud"

- aiNotes (1-2 sætninger): hvad er anderledes, og hvad har det af betydning.
  Hold tonen ærlig og handlingsrettet, aldrig dømmende.
  ✓ "Du har byttet gulerod ud med peberfrugt — fint, samme vitaminprofil. Brug
     halvanden gang så meget næste gang for at ramme volumen."
  ✗ "Du følger ikke planen"

# Vurderings-principper

1. Du kommenterer KUN på det du faktisk kan se. Hvis tallerkenen er taget skråt
   eller dele er uden for billedet, sig det i headline.

2. Whole-food substitutter scorer højt (broccoli i stedet for blomkål er ok).

3. Synlige UPF, sodavand, frituresteg, hvid pasta-bunke uden andet → træk i
   matchScore og påpeg det i notes.

4. Vær ikke nedladende. Medlemmet har lige spist det. Mød dem hvor de er.

5. Hvis billedet ikke viser et måltid (sløret, blank, irrelevant): matchScore=0,
   headline="Kunne ikke vurdere — billedet viser ikke et tydeligt måltid",
   notes="Tag billedet ovenfra med klar belysning næste gang."`;

/* ---------------------------------------------------------------- *
 * Public API
 * ---------------------------------------------------------------- */

export async function gradeMealPhoto(
  opts: MealPhotoGradeOpts
): Promise<MealPhotoGrade | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!opts.photoBase64) return null;

  const mediaType = normalizeMime(opts.mimeType);
  if (!mediaType) return null;

  const client = new Anthropic({ apiKey });

  const userText = [
    `Planlagt måltid: ${opts.plannedTitle}`,
    "",
    "Planlagte hovedingredienser:",
    opts.plannedIngredients.map((i) => `  - ${i.name}`).join("\n"),
    "",
    "Vurderér om billedet matcher planen. Returnér via submit_grade.",
  ].join("\n");

  try {
    const response = await client.messages.parse({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
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
            { type: "text", text: userText },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: opts.photoBase64,
              },
            },
          ],
        },
      ],
      output_config: {
        format: zodOutputFormat(GradeSchema),
      },
    });

    return response.parsed_output ?? null;
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.warn(
        `[nutrition-photo-claude] Anthropic API error ${err.status}: ${err.message}`
      );
    } else {
      console.warn("[nutrition-photo-claude] Failed:", err);
    }
    return null;
  }
}

/* ---------------------------------------------------------------- *
 * Helpers
 * ---------------------------------------------------------------- */

function normalizeMime(
  raw: string
): "image/jpeg" | "image/png" | "image/webp" | "image/gif" | null {
  const lower = raw.toLowerCase();
  if (lower.includes("jpeg") || lower.includes("jpg")) return "image/jpeg";
  if (lower.includes("png")) return "image/png";
  if (lower.includes("webp")) return "image/webp";
  if (lower.includes("gif")) return "image/gif";
  // HEIC isn't supported by the API directly — Supabase might transcode,
  // but if not, we skip rather than throw.
  return null;
}
