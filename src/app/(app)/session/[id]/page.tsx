import { TODAY_SESSION } from "@/lib/workout";
import { notFound } from "next/navigation";
import SessionClient from "./SessionClient";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getFullSession } from "@/lib/data/session";
import { getSession } from "@/lib/auth";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (SUPABASE_ENABLED) {
    const member = await getSession();
    if (!member) notFound();
    const session = await getFullSession(id, member.id);
    if (!session) notFound();
    return <SessionClient session={session} />;
  }

  // Demo mode — only the static TODAY_SESSION resolves
  const session = id === TODAY_SESSION.id ? TODAY_SESSION : null;
  if (!session) notFound();
  return <SessionClient session={session} />;
}
