"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import type { ExerciseMistake } from "@/lib/data/exercises";
import type { ExercisePhase } from "@/lib/data/exercises";

/* ---------------------------------------------------------------- *
 * Create — a minimal draft exercise (slug + name), unpublished
 * ---------------------------------------------------------------- */

/**
 * lowercase, dash-separated, alphanumeric. normalize("NFD") splits
 * accented chars (æ→a + mark); the non-alphanumeric replace then
 * drops the combining marks, so "Bænkpres" → "b-nkpres". Good enough
 * for a slug — coaches can always type an explicit one.
 */
function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createExerciseAction(input: {
  name: string;
  slug?: string;
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  if (!SUPABASE_ENABLED) return { ok: false, error: "Supabase ikke konfigureret" };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Navn er påkrævet" };
  const slug = slugify(input.slug?.trim() || name);
  if (!slug) return { ok: false, error: "Kunne ikke danne et gyldigt slug" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Ingen forbindelse" };

  const { error } = await supabase.from("exercises").insert({
    slug,
    name,
    is_published: false,
  });

  if (error) {
    const dup = error.code === "23505";
    return {
      ok: false,
      error: dup
        ? `Slug "${slug}" findes allerede — vælg et andet navn/slug.`
        : error.message,
    };
  }

  revalidatePath("/coach/exercises");
  return { ok: true, slug };
}

/* ---------------------------------------------------------------- *
 * Save — full upsert of one exercise row
 * ---------------------------------------------------------------- */

export type ExerciseSavePayload = {
  id: string;
  slug: string;
  name: string;
  category: string | null;
  pattern: string | null;
  equipment: string | null;
  difficulty: "beginner" | "intermediate" | "advanced" | null;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  tertiaryMuscles: string[];
  cues: string[];
  mistakes: ExerciseMistake[];
  whyMatters: string | null;
  setup: string | null;
  progression: string | null;
  regression: string | null;
  displayOrder: number;
  isPublished: boolean;
  phases: ExercisePhase[];
};

export async function saveExerciseAction(
  payload: ExerciseSavePayload,
): Promise<{ ok: boolean; error?: string }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Ingen forbindelse" };

  const { error } = await supabase
    .from("exercises")
    .update({
      name: payload.name,
      category: payload.category,
      pattern: payload.pattern,
      equipment: payload.equipment,
      difficulty: payload.difficulty,
      primary_muscles: payload.primaryMuscles,
      secondary_muscles: payload.secondaryMuscles,
      tertiary_muscles: payload.tertiaryMuscles,
      cues: payload.cues,
      mistakes: payload.mistakes,
      why_matters: payload.whyMatters,
      setup: payload.setup,
      progression: payload.progression,
      regression: payload.regression,
      display_order: payload.displayOrder,
      is_published: payload.isPublished,
      phases: payload.phases,
    })
    .eq("id", payload.id);

  if (error) return { ok: false, error: error.message };

  // The detail page + library index both read this row.
  revalidatePath("/coach/exercises");
  revalidatePath(`/coach/exercises/${payload.slug}`);
  revalidatePath("/train/exercises");
  revalidatePath(`/train/exercises/${payload.slug}`);
  return { ok: true };
}

/* ---------------------------------------------------------------- *
 * Demo asset — persist demo_asset_url after a coach uploads the WebM
 * ---------------------------------------------------------------- */

/**
 * Called by DemoAssetUploader after the WebM lands in the
 * `exercise-demos` bucket. The WebM is the canonical primary asset;
 * its public URL (plus a `?v=` cache-bust — the bucket is CDN-cached
 * so a re-upload of the same path needs a changed URL) becomes
 * demo_asset_url. The mp4/poster siblings are derived, never stored.
 */
export async function uploadDemoAssetAction(input: {
  exerciseId: string;
  slug: string;
}): Promise<{ ok: boolean; demoAssetUrl?: string; error?: string }> {
  if (!SUPABASE_ENABLED) return { ok: false, error: "Supabase ikke konfigureret" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "Ingen forbindelse" };

  const { data } = supabase.storage
    .from("exercise-demos")
    .getPublicUrl(`${input.slug}.webm`);
  const demoAssetUrl = `${data.publicUrl}?v=${Date.now()}`;

  const { error } = await supabase
    .from("exercises")
    .update({ demo_asset_url: demoAssetUrl })
    .eq("id", input.exerciseId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/coach/exercises");
  revalidatePath(`/coach/exercises/${input.slug}`);
  revalidatePath("/train/exercises");
  revalidatePath(`/train/exercises/${input.slug}`);
  return { ok: true, demoAssetUrl };
}
