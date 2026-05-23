import { TODAY_SESSION } from "@/lib/workout";
import { notFound } from "next/navigation";
import SessionClient from "./SessionClient";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getFullSession } from "@/lib/data/session";
import { getSession } from "@/lib/auth";
import {
  FORM_CHECK_LIMIT,
  type FormCheckQuota,
} from "@/lib/data/form-check-quota";
import { getFormCheckQuota } from "@/lib/data/form-check-quota-server";
import { getTodaysReadinessNudge } from "@/lib/data/hrv";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (SUPABASE_ENABLED) {
    const member = await getSession();
    if (!member) notFound();
    const [session, quota, readinessNudge] = await Promise.all([
      getFullSession(id, member.id),
      getFormCheckQuota(member.id, member.tier),
      getTodaysReadinessNudge(member.id),
    ]);
    if (!session) notFound();
    return (
      <SessionClient
        session={session}
        formCheckQuota={quota}
        readinessNudge={readinessNudge}
      />
    );
  }

  // Demo mode — only the static TODAY_SESSION resolves
  const session = id === TODAY_SESSION.id ? TODAY_SESSION : null;
  if (!session) notFound();
  const quota: FormCheckQuota = {
    used: 0,
    limit: FORM_CHECK_LIMIT.Legend,
    remaining: FORM_CHECK_LIMIT.Legend,
    resetsAt: new Date().toISOString(),
    hasRemaining: true,
  };
  return (
    <SessionClient
      session={session}
      formCheckQuota={quota}
      readinessNudge={null}
    />
  );
}
