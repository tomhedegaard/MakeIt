import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getCompletedSessionIds,
  getSessionBySlug,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import SessionRunner from "@/components/mind/SessionRunner";

interface Params {
  slug: string;
}

/**
 * `/mind/sessions/[slug]` — individual session page.
 *
 * Reuses the SessionRunner overlay; completion fires via the shared
 * server action defined for /mind/today. Reps awarded as "hero"
 * if is_hero=true on the session row (10 vs 5 for personal).
 */
export default async function MindSessionRunnerPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const member = await getSession();
  if (!member) redirect("/login");
  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const [session, completedIds] = await Promise.all([
    getSessionBySlug(slug),
    getCompletedSessionIds(member.id),
  ]);

  if (!session) notFound();

  // Override the session id for hero sessions so completion action
  // can detect is_hero via the prefix convention (see today/actions.ts).
  const runnerId = session.is_hero ? `hero-${session.id}` : session.id;

  return (
    <>
      <PageHeader
        eyebrow={`Mind · ${session.category}`}
        title={session.title}
        subtitle={session.subtitle ?? undefined}
      />
      <Container size="narrow" className="py-10 md:py-14 space-y-6">
        <Link
          href="/mind/sessions"
          className="inline-block text-fg-dim text-sm hover:text-fg"
        >
          ← Tilbage til bibliotek
        </Link>

        <SessionRunner
          sessionId={runnerId}
          title={session.title}
          subtitle={session.subtitle}
          bodyMd={session.body_md}
          visualPattern={session.visual_pattern}
          durationSeconds={session.duration_seconds}
          audioUrl={session.audio_url}
          context="library"
          alreadyCompleted={completedIds.has(session.id)}
        />
      </Container>
    </>
  );
}
