import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import LessonForm from "@/components/coach-school/LessonForm";
import { loadLessonBySlug } from "@/lib/data/lessons";

/**
 * CC-6 — single lesson detail. Video placeholder, quiz, practice
 * scenario, submit. Tier-locked lessons redirect to /coach-school.
 *
 * Spec: docs/superpowers/specs/2026-05-25-crew-coaching-pyramid-v0-design.md §8
 */
function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export default async function CoachSchoolLessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTranslations("CoachSchool");
  const lesson = await loadLessonBySlug(slug);
  if (!lesson) notFound();
  if (!lesson.unlocked) redirect("/coach-school");

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <Link
        href="/coach-school"
        className="inline-flex items-center text-xs font-mono uppercase tracking-[0.16em] text-fg-faint hover:text-fg"
      >
        {t("lesson.backToTree")}
      </Link>

      <header className="pt-2">
        <div className="eyebrow mb-2">
          {t(`tree.tierHeader.${lesson.requiredTier}`)}
          {" · "}
          {fmtDuration(lesson.durationSec)}
        </div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
          {lesson.titleDa}
        </h1>
      </header>

      {/* Video — v0 placeholder when the bucket URL isn't yet recorded. */}
      <section className="surface rounded-xl overflow-hidden bg-bg-3">
        {lesson.videoUrl ? (
          <video
            src={lesson.videoUrl}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[420px] object-contain bg-black"
          />
        ) : (
          <div className="aspect-video flex items-center justify-center text-fg-faint text-sm">
            {t("lesson.videoPlaceholder")}
          </div>
        )}
        <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-[0.16em] text-fg-faint border-t hairline">
          {t("lesson.recordedBy")}
        </div>
      </section>

      <LessonForm lesson={lesson} />
    </Container>
  );
}
