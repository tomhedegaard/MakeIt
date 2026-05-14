import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import ExerciseCard from "@/components/exercise/ExerciseCard";
import { COMPANY } from "@/lib/company";
import { listPublishedExercises } from "@/lib/data/exercises";

export const metadata = {
  title: `Øvelser · Train · ${COMPANY.product}`,
};

const CATEGORY_LABELS: Record<string, string> = {
  "lower-body": "Ben",
  "upper-body-push": "Push",
  "upper-body-pull": "Pull",
  "full-body": "Helkrop",
  shoulders: "Skuldre",
  arms: "Arme",
  core: "Core",
};

type SearchParams = Promise<{ category?: string }>;

export default async function ExercisesIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { category } = await searchParams;
  const exercises = await listPublishedExercises(
    category ? { category } : undefined,
  );

  // Build the category pill list from the full set so the filter row
  // is stable regardless of which subset is currently selected.
  const allExercises = category
    ? await listPublishedExercises()
    : exercises;
  const categories = Array.from(
    new Set(allExercises.map((e) => e.category).filter(Boolean)),
  ) as string[];

  return (
    <>
      <PageHeader
        eyebrow="Train · Øvelses-bibliotek"
        title="Øvelser."
        subtitle="Hver øvelse: hvilke muskler den rammer, hvordan du udfører den rigtigt, og hvad du skal undgå. Vores form-coach på print."
      />

      <Container className="py-10 md:py-14 space-y-8">
        {/* Filter row */}
        {categories.length > 0 ? (
          <nav className="flex flex-wrap gap-2">
            <FilterPill href="/train/exercises" active={!category} label="Alle" />
            {categories.map((c) => (
              <FilterPill
                key={c}
                href={`/train/exercises?category=${c}`}
                active={category === c}
                label={CATEGORY_LABELS[c] ?? c}
              />
            ))}
          </nav>
        ) : null}

        {/* Grid */}
        {exercises.length === 0 ? (
          <p className="text-fg-dim">Ingen øvelser i biblioteket endnu.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exercises.map((ex) => (
              <li key={ex.slug}>
                <ExerciseCard exercise={ex} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-[0.14em] border hairline transition-colors ${
        active
          ? "bg-fg text-bg border-transparent"
          : "text-fg-dim hover:text-fg hover:border-fg/30"
      }`}
    >
      {label}
    </Link>
  );
}
