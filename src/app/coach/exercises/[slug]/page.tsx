import { notFound } from "next/navigation";
import Container from "@/components/Container";
import { getExerciseForEdit } from "@/lib/data/exercises";
import ExerciseEditor from "./ExerciseEditor";

export const metadata = { title: "Øvelse-editor · Coach" };

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
