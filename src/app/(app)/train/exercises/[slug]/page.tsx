import Link from "next/link";
import { notFound } from "next/navigation";
import Container from "@/components/Container";
import { COMPANY } from "@/lib/company";
import {
  dominantView,
  getExerciseBySlug,
  listPublishedExerciseSlugs,
} from "@/lib/data/exercises";
import ExerciseHero from "./ExerciseHero";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const slugs = await listPublishedExerciseSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const ex = await getExerciseBySlug(slug);
  return {
    title: ex ? `${ex.name} · Train · ${COMPANY.product}` : "Øvelse",
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  "lower-body": "Ben",
  "upper-body-push": "Push",
  "upper-body-pull": "Pull",
  "full-body": "Helkrop",
  shoulders: "Skuldre",
  arms: "Arme",
  core: "Core",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Begynder",
  intermediate: "Mellem",
  advanced: "Avanceret",
};

export default async function ExerciseDetailPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const ex = await getExerciseBySlug(slug);
  if (!ex) notFound();

  const view = dominantView(ex);

  return (
    <>
      {/* Custom header — denser than PageHeader because the figure
          + cues hero is what the page is really about. */}
      <div className="border-b hairline">
        <Container className="py-8 md:py-12">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <div className="eyebrow mb-3 flex flex-wrap items-center gap-2">
                <Link href="/train/exercises" className="hover:text-fg">
                  Øvelser
                </Link>
                {ex.category ? (
                  <>
                    <span aria-hidden>·</span>
                    <Link
                      href={`/train/exercises?category=${ex.category}`}
                      className="hover:text-fg"
                    >
                      {CATEGORY_LABELS[ex.category] ?? ex.category}
                    </Link>
                  </>
                ) : null}
                {ex.equipment ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{ex.equipment}</span>
                  </>
                ) : null}
                {ex.difficulty ? (
                  <>
                    <span aria-hidden>·</span>
                    <span>{DIFFICULTY_LABELS[ex.difficulty] ?? ex.difficulty}</span>
                  </>
                ) : null}
              </div>
              <h1 className="font-display text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.95]">
                {ex.name}.
              </h1>
              {ex.whyMatters ? (
                <p className="mt-4 max-w-2xl text-fg-dim text-base md:text-lg">
                  {ex.whyMatters}
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-10 md:py-14 space-y-14">
        {/* Hero: figure + cues */}
        <ExerciseHero
          primary={ex.primaryMuscles}
          secondary={ex.secondaryMuscles}
          tertiary={ex.tertiaryMuscles}
          defaultView={view}
          cues={ex.cues}
        />

        {/* Mistakes */}
        {ex.mistakes.length > 0 ? (
          <section className="space-y-5">
            <div className="eyebrow">Typiske fejl</div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {ex.mistakes.map((m, i) => (
                <article
                  key={i}
                  className="surface-2 rounded-xl p-5 border-l-2 border-l-[#C97B3E]"
                >
                  <div className="font-display text-lg leading-tight mb-2">
                    {m.title}
                  </div>
                  <p className="text-sm text-fg-dim leading-relaxed">{m.body}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {/* Setup + Progression/Regression */}
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ex.setup ? (
            <InfoBlock eyebrow="Setup" body={ex.setup} />
          ) : null}
          {ex.progression ? (
            <InfoBlock eyebrow="Progression" body={ex.progression} />
          ) : null}
          {ex.regression ? (
            <InfoBlock eyebrow="Regression" body={ex.regression} />
          ) : null}
        </section>
      </Container>
    </>
  );
}

function InfoBlock({ eyebrow, body }: { eyebrow: string; body: string }) {
  return (
    <div className="space-y-2">
      <div className="eyebrow">{eyebrow}</div>
      <p className="text-base text-fg-dim leading-relaxed">{body}</p>
    </div>
  );
}
