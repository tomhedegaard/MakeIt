import AppShell from "@/components/app/AppShell";
import PushSWRegister from "@/components/push/PushSWRegister";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

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

  return (
    <AppShell member={member}>
      <PushSWRegister />
      {children}
    </AppShell>
  );
}
