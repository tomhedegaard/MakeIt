import type { Metadata, Viewport } from "next";
import AppShell from "@/components/app/AppShell";
import ThemeScope from "@/components/ui/ThemeScope";
import { COMPANY } from "@/lib/company";
import { getSession, signOutLeftoverAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getUnreadCount } from "@/lib/data/messages";
import { youthClaimsFor } from "@/lib/youth/account";

// Kalk: light browser chrome (spec §2, §6). Viewport merges per key, so
// width/viewportFit from the root layout survive.
export const viewport: Viewport = { themeColor: "#FFFFFF", colorScheme: "light" };

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

  // MakeIt Ung (spec 2026-09-27-makeit-ung-design.md): a young account
  // gets the youth product — its own navigation, no adult onboarding
  // (max lifts, goals). Middleware already keeps it to youth routes.
  const youth = SUPABASE_ENABLED ? await youthClaimsFor(member.id) : null;
  if (youth) {
    return (
      <ThemeScope theme="nord" className="flex flex-col h-dvh lg:h-auto lg:min-h-dvh lg:flex-1">
        <AppShell member={member} youth={youth}>
          {children}
        </AppShell>
      </ThemeScope>
    );
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
    <ThemeScope theme="nord" className="flex flex-col h-dvh lg:h-auto lg:min-h-dvh lg:flex-1">
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
