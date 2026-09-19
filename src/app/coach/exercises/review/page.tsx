import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import ExerciseReviewQueue from "@/components/coach/ExerciseReviewQueue";
import { listAllExercisesForCoach } from "@/lib/data/exercises";

export async function generateMetadata() {
  const t = await getTranslations("CoachStudio.exercises.review");
  return { title: t("metaTitle") };
}

/** Drafts with a video, in library order. Drafts without one stay in the editor. */
export default async function CoachExerciseReviewPage() {
  const t = await getTranslations("CoachStudio.exercises.review");
  const drafts = (await listAllExercisesForCoach()).filter((ex) => !ex.isPublished && ex.demoAssetUrl);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">{t("title")}</h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">{t("intro")}</p>
        <Link href="/coach/exercises" className="mt-4 inline-block text-sm text-fg-dim underline underline-offset-4">
          {t("back")}
        </Link>
      </header>

      <ExerciseReviewQueue drafts={drafts} />
    </Container>
  );
}
