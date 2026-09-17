import type { Metadata, Viewport } from "next";
import AppShell from "@/components/app/AppShell";
import ThemeScope from "@/components/ui/ThemeScope";
import { COMPANY } from "@/lib/company";
import { getSession, signOutLeftoverAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getUnreadCount } from "@/lib/data/messages";

// Kalk: light browser chrome (spec §2, §6). Viewport merges per key, so
// width/viewportFit from the root layout survive.
export const viewport: Viewport = { themeColor: "#E7E9EB", colorScheme: "light" };

// Metadata merges shallowly: appleWebApp replaces the root object, so
// capable + title are restated. "default" gives dark status text on Kalk.
export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "default", title: COMPANY.name },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getSession();
  if (!member) {
    const leftover = await signOutLeftoverAuthUser();
    redirect(leftover ? "/login?err=invite" : "/login");
  }

  // Connected mode: force onboarding before any app surface.
  // Demo mode skips this — the mock member is "onboarded" by default.
  if (SUPABASE_ENABLED && !member.onboardedAt) {
    redirect("/onboarding");
  }

  // Unread chat count for the nav badge. Cheap count(*) — runs on
  // every (app) navigation, so kept tight in messages.ts.
  const unreadMessages = SUPABASE_ENABLED ? await getUnreadCount(member.id) : 0;

  return (
    <ThemeScope theme="kalk" className="flex-1 flex flex-col">
      <AppShell
        member={member}
        unreadMessages={unreadMessages}
        demoMode={!SUPABASE_ENABLED}
      >
        {children}
      </AppShell>
    </ThemeScope>
  );
}
