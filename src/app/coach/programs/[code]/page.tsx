import { notFound } from "next/navigation";
import Container from "@/components/Container";
import { getProgramBuilder, getAssignableMembers } from "@/lib/data/coach-programs";
import { listPublishedExercises } from "@/lib/data/exercises";
import ProgramBuilder from "./ProgramBuilder";

export const metadata = { title: "Program builder · Coach" };

export default async function ProgramBuilderPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const decoded = decodeURIComponent(code);

  const [program, libraryRaw, members] = await Promise.all([
    getProgramBuilder(decoded),
    listPublishedExercises(),
    getAssignableMembers(),
  ]);

  if (!program) notFound();

  // Minimal shape for the exercise picker dropdown.
  const library = libraryRaw.map((e) => ({ id: e.id, name: e.name }));

  return (
    <Container className="py-6 lg:py-12">
      <ProgramBuilder program={program} library={library} members={members} />
    </Container>
  );
}
