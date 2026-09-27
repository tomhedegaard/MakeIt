import type { Metadata, Viewport } from "next";
import AppShell from "@/components/app/AppShell";
import ThemeScope from "@/components/ui/ThemeScope";
import { COMPANY } from "@/lib/company";
import { getSession, signOutLeftoverAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { getUnreadCount } from "@/lib/data/messages";
import { isYouthAccount } from "@/lib/youth/account";
import YouthWaiting from "@/components/youth/YouthWaiting";

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
  // never reaches the adult app or its onboarding. Until the youth
  // product ships, it sees a waiting screen instead of any (app) route.
  if (SUPABASE_ENABLED && (await isYouthAccount(member.id))) {
    return (
      <ThemeScope theme="nord" className="flex flex-col h-dvh lg:h-auto lg:minh-dvh lg:flex-1">
        <YouthWaiting firstName={member.displayName ?? member.handle} />
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
    <ThemeScope theme="nord" className="flex flex-col h-dvh lg:h-auto lg:minh-dvh lg:flex-1">
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
