import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import { getEditableSession } from "@/lib/data/coach-program";
import SessionEditor from "./SessionEditor";

export default async function CoachSessionEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getEditableSession(id);
  if (!session) notFound();

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <Link
        href={`/coach/members/${session.memberId}`}
        className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg"
      >
        ← @{session.memberHandle}
      </Link>

      <header>
        <div className="eyebrow mb-2">
          {session.programCode ? `${session.programCode} · uge ${session.week ?? "—"}` : "Custom"}
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95]">
          Rediger session
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          Tilpas øvelser, sæt og hvile. Ændringer gemmes på medlemmets program
          og synes på Today / Træn med det samme.
        </p>
      </header>

      <SessionEditor session={session} />
    </Container>
  );
}
