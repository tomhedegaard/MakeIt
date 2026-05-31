import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getExerciseForEdit } from "@/lib/data/exercises";
import ExerciseEditor from "./ExerciseEditor";

export async function generateMetadata() {
  const t = await getTranslations("CoachStudio.exerciseEditor");
  return { title: t("metaTitle") };
}

export default async function ExerciseEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const exercise = await getExerciseForEdit(decodeURIComponent(slug));
  if (!exercise) notFound();

  return (
    <Container className="py-6 lg:py-12">
      <ExerciseEditor exercise={exercise} />
    </Container>
  );
}
