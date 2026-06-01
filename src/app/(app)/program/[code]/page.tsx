import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { COMPANY } from "@/lib/company";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/data/muscle-groups";
import {
  getMemberProgramByCode,
  type ProgramDetailDay,
  type ProgramDetailExercise,
  type ProgramDetailSet,
} from "@/lib/data/program-detail";

type Params = Promise<{ code: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { code } = await params;
  const p = await getMemberProgramByCode(code);
  const t = await getTranslations("ProgramDetail");
  return {
    title: p
      ? `${p.name} · ${p.code} · ${COMPANY.product}`
      : t("metaFallback"),
  };
}

export default async function ProgramDetailPage({
  params,
}: {
  params: Params;
}) {
  const { code } = await params;
  const program = await getMemberProgramByCode(code);
  if (!program) notFound();

  const t = await getTranslations("ProgramDetail");

  return (
    <>
      <div className="border-b hairline">
        <Container className="py-8 md:py-12">
          <div className="eyebrow mb-3 flex flex-wrap items-center gap-2">
            <Link href="/coaching" className="hover:text-fg">
              {t("breadcrumb")}
            </Link>
            <span aria-hidden>·</span>
            <span>{program.code}</span>
            <span aria-hidden>·</span>
            <span>{program.type}</span>
          </div>
          <h1 className="font-display text-[clamp(2.2rem,5.5vw,4rem)] leading-[0.95]">
            {program.name}.
          </h1>
          {program.description ? (
            <p className="mt-4 max-w-2xl text-fg-dim text-base md:text-lg">
              {program.description}
            </p>
          ) : null}

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline rounded-lg overflow-hidden">
            <Meta label={t("meta.weeks")} value={program.weeks} />
            <Meta label={t("meta.days")} value={program.days.length} />
            <Meta
              label={t("meta.level")}
              value={program.level ?? t("meta.levelFallback")}
            />
            <Meta
              label={t("meta.coach")}
              value={program.coachName ?? t("meta.coachFallback")}
            />
          </div>
        </Container>
      </div>

      <Container className="py-10 md:py-14 space-y-10">
        <section>
          <div className="eyebrow mb-3">{t("template.eyebrow")}</div>
          <h2 className="font-display text-2xl md:text-3xl leading-[1.05] max-w-xl">
            {t("template.title", { weeks: program.weeks })}
          </h2>
          <p className="mt-3 text-fg-dim text-sm md:text-base max-w-xl">
            {t("template.body")}
          </p>
        </section>

        {program.days.length === 0 ? (
          <div className="surface-2 rounded-2xl p-8 text-center text-sm text-fg-dim">
            {t("emptyDays")}
          </div>
        ) : (
          <ol className="space-y-6">
            {program.days.map((day) => (
              <DayCard key={day.id} day={day} />
            ))}
          </ol>
        )}
      </Container>
    </>
  );
}

function Meta({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-bg-2 px-4 py-3">
      <div className="eyebrow mb-1">{label}</div>
      <div className="numeric text-xl md:text-2xl">{value}</div>
    </div>
  );
}

async function DayCard({ day }: { day: ProgramDetailDay }) {
  const t = await getTranslations("ProgramDetail");
  const setCount = day.exercises.reduce((a, e) => a + e.sets.length, 0);

  return (
    <li>
      <article className="surface-2 rounded-2xl overflow-hidden">
        <header className="px-5 pt-5 pb-4 border-b hairline">
          <div className="flex items-end justify-between gap-4 mb-2">
            <div className="min-w-0">
              <div className="eyebrow mb-1">
                {t("day.position", { position: day.position })}
              </div>
              <h3 className="font-display text-2xl md:text-3xl leading-[1.05]">
                {day.dayLabel}
              </h3>
            </div>
            <div className="text-right shrink-0">
              <div className="numeric text-xl">
                {day.estimatedMinutes ?? "—"}
                {day.estimatedMinutes ? (
                  <span className="text-fg-dim text-sm ml-0.5">m</span>
                ) : null}
              </div>
              <div className="eyebrow">{t("day.estTime")}</div>
            </div>
          </div>
          <p className="text-fg-dim text-sm md:text-base">{day.title}</p>
          <div className="mt-3 flex items-center gap-3 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            <span>{t("day.exercises", { count: day.exercises.length })}</span>
            <span aria-hidden>·</span>
            <span>{t("day.sets", { count: setCount })}</span>
          </div>
        </header>

        <ul className="divide-y hairline">
          {day.exercises.map((ex, i) => (
            <ExerciseRow key={ex.id} ex={ex} index={i} />
          ))}
        </ul>
      </article>
    </li>
  );
}

function ExerciseRow({
  ex,
  index,
}: {
  ex: ProgramDetailExercise;
  index: number;
}) {
  const body = (
    <>
      <span className="numeric text-fg-faint text-xs w-6 shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm md:text-base text-fg/90 truncate">
          {ex.exerciseName}
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px] font-mono text-fg-faint">
          <span className="numeric">{formatSetScheme(ex.sets)}</span>
          {ex.primaryMuscles.length > 0 ? (
            <>
              <span aria-hidden>·</span>
              <MuscleChips muscles={ex.primaryMuscles} />
            </>
          ) : null}
        </div>
      </div>
      {ex.slug ? (
        <span
          className="text-fg-dim shrink-0 text-[11px] font-mono uppercase tracking-[0.14em]"
          aria-hidden
        >
          →
        </span>
      ) : null}
    </>
  );

  return (
    <li>
      {ex.slug ? (
        <Link
          href={`/train/exercises/${ex.slug}`}
          className="flex items-center gap-3 px-5 py-3 lift"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-3 px-5 py-3">{body}</div>
      )}
    </li>
  );
}

function MuscleChips({ muscles }: { muscles: MuscleGroup[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {muscles.slice(0, 3).map((m) => (
        <span
          key={m}
          className="px-1.5 py-0.5 rounded-full bg-bg-3 text-fg-dim normal-case tracking-normal"
        >
          {MUSCLE_LABELS[m]}
        </span>
      ))}
    </span>
  );
}

function formatSetScheme(sets: ProgramDetailSet[]): string {
  if (sets.length === 0) return "—";
  // Collapse identical sets: e.g., three (5 reps × 100 kg @ RPE 8) →
  // "3 × 5 reps · 100 kg @ RPE 8". Mixed schemes get spelled out
  // briefly to avoid a wall of text on the day card.
  const key = (s: ProgramDetailSet) =>
    `${s.reps}|${s.weight}|${s.rpe ?? ""}`;
  const allSame = sets.every((s) => key(s) === key(sets[0]));
  if (allSame) {
    return `${sets.length} × ${describeSet(sets[0])}`;
  }
  return sets.map(describeSet).join(" · ");
}

function describeSet(s: ProgramDetailSet): string {
  const parts: string[] = [];
  if (s.reps > 0) parts.push(`${s.reps} reps`);
  if (s.weight > 0) parts.push(`${s.weight} kg`);
  if (s.rpe) parts.push(`RPE ${s.rpe}`);
  return parts.join(" · ") || "—";
}
