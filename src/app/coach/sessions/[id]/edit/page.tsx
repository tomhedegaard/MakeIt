import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

  const t = await getTranslations("CoachStudio.sessionEditor");

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <Link
        href={`/coach/members/${session.memberId}`}
        className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg"
      >
        {t("backToMember", { handle: session.memberHandle })}
      </Link>

      <header>
        <div className="eyebrow mb-2">
          {session.programCode
            ? t("programEyebrow", {
                code: session.programCode,
                week: session.week ?? t("weekUnknown"),
              })
            : t("customEyebrow")}
        </div>
        <h1 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[0.95]">
          {t("title")}
        </h1>
        <p className="mt-2 text-fg-dim text-sm">
          {t("intro")}
        </p>
      </header>

      <SessionEditor session={session} />
    </Container>
  );
}
