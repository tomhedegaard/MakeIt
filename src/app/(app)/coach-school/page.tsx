import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import {
  loadLessonsForMember,
  type LessonForList,
  type RequiredTier,
} from "@/lib/data/lessons";

/**
 * CC-6 — Coach School lesson-tree surface.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §8
 *
 * Lists every published lesson grouped by required tier (athlete /
 * beast / legend). Each row shows lock state (computed from the
 * member's tier — Munk always sees all), completion status, and
 * Reps reward for first completion. Tapping a row routes to
 * /coach-school/lessons/[slug] for the full quiz + practice scenario.
 *
 * Reps reward landing in lesson_progress is wired by CC-10; until
 * then completed lessons are just stamped completed_at.
 */
const TIER_ORDER: RequiredTier[] = ["athlete", "beast", "legend"];

function groupByTier(
  lessons: LessonForList[],
): Record<RequiredTier, LessonForList[]> {
  const out: Record<RequiredTier, LessonForList[]> = {
    athlete: [],
    beast: [],
    legend: [],
  };
  for (const l of lessons) out[l.requiredTier].push(l);
  return out;
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default async function CoachSchoolTreePage() {
  const t = await getTranslations("CoachSchool");
  const lessons = await loadLessonsForMember();
  const grouped = groupByTier(lessons);

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("tree.eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {t("tree.title")}
        </h1>
        <p className="mt-2 text-fg-dim text-sm">{t("tree.subtitle")}</p>
      </header>

      {lessons.length === 0 ? (
        <div className="surface-2 rounded-lg p-6 text-center">
          <p className="text-fg-dim text-sm">{t("tree.empty")}</p>
        </div>
      ) : (
        TIER_ORDER.map((tier) => {
          const group = grouped[tier];
          if (group.length === 0) return null;
          return (
            <section key={tier} className="space-y-3">
              <div className="eyebrow">{t(`tree.tierHeader.${tier}`)}</div>
              <ul className="space-y-2">
                {group.map((l) => (
                  <li key={l.id}>
                    {l.unlocked ? (
                      <Link
                        href={`/coach-school/lessons/${l.slug}`}
                        className="surface rounded-lg p-4 hover:bg-bg-3 transition-colors flex items-start gap-4 cursor-pointer"
                      >
                        <LessonRowInner lesson={l} t={t} />
                      </Link>
                    ) : (
                      <div
                        className="surface-2 rounded-lg p-4 flex items-start gap-4 opacity-60"
                        aria-disabled="true"
                      >
                        <LessonRowInner lesson={l} t={t} locked />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </Container>
  );
}

/**
 * Inner content of a lesson row, factored so the Link/div wrappers
 * stay clean. Receives the bound translator via prop so the parent
 * server-component scope is preserved.
 */
function LessonRowInner({
  lesson,
  t,
  locked = false,
}: {
  lesson: LessonForList;
  t: (key: string, values?: Record<string, string | number>) => string;
  locked?: boolean;
}) {
  return (
    <>
      <span aria-hidden="true" className="text-xl leading-none shrink-0">
        {locked ? "🔒" : lesson.completedAt ? "✓" : "▸"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg/90 leading-snug">{lesson.titleDa}</p>
        <div className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint mt-1">
          {fmtDuration(lesson.durationSec)}
          {" · "}
          {t("tree.repsLine", { reps: lesson.repsAward })}
          {lesson.completedAt
            ? ` · ${t("tree.completedTag")}`
            : locked
              ? ` · ${t(`tree.lockedTag.${lesson.requiredTier}`)}`
              : ""}
        </div>
      </div>
    </>
  );
}
