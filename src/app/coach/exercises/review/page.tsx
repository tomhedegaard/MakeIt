import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import ExerciseReviewQueue from "@/components/coach/ExerciseReviewQueue";
import FilterPill from "@/components/exercise/FilterPill";
import { draftCategoryCounts, pickReviewCategory } from "@/lib/coach/review-queue";
import { listAllExercisesForCoach } from "@/lib/data/exercises";

export async function generateMetadata() {
  const t = await getTranslations("CoachStudio.exercises.review");
  return { title: t("metaTitle") };
}

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** Drafts with a video, in library order. Drafts without one stay in the editor. */
export default async function CoachExerciseReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("CoachStudio.exercises.review");
  const tTrain = await getTranslations("Train");
  const all = (await listAllExercisesForCoach()).filter((ex) => !ex.isPublished && ex.demoAssetUrl);

  // The filter stays on the requested category even when it has no drafts
  // left: approving the last one re-renders this page, and falling back to
  // "all" would remount the queue on the full list (see pickReviewCategory).
  const counts = draftCategoryCounts(all);
  const category = pickReviewCategory((await searchParams).category);
  const drafts = category ? all.filter((ex) => ex.category === category) : all;

  const categoryLabel = (c: string) => (tTrain.has(`categories.${c}`) ? tTrain(`categories.${c}`) : c);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-title">{t("title")}</h1>
        <p className="mt-3 text-fg-dim text-meta md:text-copy max-w-md">{t("intro")}</p>
        <Link href="/coach/exercises" className="mt-4 inline-block text-meta text-fg-dim underline underline-offset-4">
          {t("back")}
        </Link>
      </header>

      {counts.length > 1 || category ? (
        <nav aria-label={tTrain("index.categoryNav")} className="flex flex-wrap gap-2">
          <FilterPill href="/coach/exercises/review" active={!category} label={t("filterAll", { count: all.length })} />
          {counts.map((c) => (
            <FilterPill
              key={c.category}
              href={`/coach/exercises/review?category=${encodeURIComponent(c.category)}`}
              active={category === c.category}
              label={t("filterCategory", { label: categoryLabel(c.category), count: c.count })}
            />
          ))}
        </nav>
      ) : null}

      {/* The queue freezes its list at mount; a new key restarts it when the filter changes. */}
      <ExerciseReviewQueue key={category ?? "all"} drafts={drafts} />
    </Container>
  );
}
