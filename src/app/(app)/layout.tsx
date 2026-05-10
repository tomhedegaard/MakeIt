import AppShell from "@/components/app/AppShell";
import PushSWRegister from "@/components/push/PushSWRegister";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getUnreadCount } from "@/lib/data/messages";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getSession();
  if (!member) redirect("/login");

  // Connected mode: force onboarding before any app surface.
  // Demo mode skips this — the mock member is "onboarded" by default.
  if (SUPABASE_ENABLED && !member.onboardedAt) {
    redirect("/onboarding");
  }

  // Unread chat count for the nav badge. Cheap count(*) — runs on
  // every (app) navigation, so kept tight in messages.ts.
  const unreadMessages = SUPABASE_ENABLED ? await getUnreadCount(member.id) : 0;

  return (
    <AppShell member={member} unreadMessages={unreadMessages}>
      <PushSWRegister />
      {children}
    </AppShell>
  );
}
