import type { Viewport } from "next";
import { redirect } from "next/navigation";
import ThemeScope from "@/components/ui/ThemeScope";
import { getSession } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { isYouthAccount } from "@/lib/youth/account";

// Onboarding is Kalk (spec §2): light browser chrome. Merges with the root viewport.
export const viewport: Viewport = { themeColor: "#FFFFFF", colorScheme: "light" };

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The adult onboarding asks for max lifts and goals; a MakeIt Ung
  // account goes to the app, which shows its own screen.
  const member = SUPABASE_ENABLED ? await getSession() : null;
  if (member && (await isYouthAccount(member.id))) redirect("/dashboard");

  return (
    <ThemeScope theme="nord" className="relative z-10 minh-dvh">
      {children}
    </ThemeScope>
  );
}
