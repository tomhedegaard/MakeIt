import Link from "next/link";
import Container from "@/components/Container";
import { listAllExercisesForCoach } from "@/lib/data/exercises";
import NewExerciseForm from "@/components/coach/NewExerciseForm";

export const metadata = { title: "Øvelser · Coach" };

export default async function CoachExercisesPage() {
  const exercises = await listAllExercisesForCoach();

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">Coach console · Øvelser</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
          Øvelsesbibliotek.
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          Rediger cues, fejl, muskelgrupper og bevægelsesfaser — uden SQL.
          Det biblioteket viser på /train/exercises.
        </p>
      </header>

      <NewExerciseForm />

      {exercises.length === 0 ? (
        <p className="text-fg-dim text-sm">Ingen øvelser endnu.</p>
      ) : (
        <ul className="surface-2 rounded-xl divide-y hairline overflow-hidden">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <Link
                href={`/coach/exercises/${encodeURIComponent(ex.slug)}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-bg-3/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-display text-base leading-tight truncate">
                    {ex.name}
                  </div>
                  <div className="text-[11px] font-mono text-fg-faint truncate">
                    {ex.slug}
                    {ex.category ? ` · ${ex.category}` : ""}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-fg-dim shrink-0 hidden sm:inline">
                  {ex.primaryMuscles.length}P · {ex.secondaryMuscles.length}S ·{" "}
                  {ex.tertiaryMuscles.length}T
                </span>
                <span className="text-[11px] font-mono text-fg-faint shrink-0 hidden md:inline">
                  {ex.phases.length} faser
                </span>
                <span
                  className={`text-[10px] font-mono uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border hairline shrink-0 ${
                    ex.isPublished ? "text-fg" : "text-fg-faint"
                  }`}
                >
                  {ex.isPublished ? "Publiceret" : "Kladde"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
