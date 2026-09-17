import type { Viewport } from "next";
import { redirect } from "next/navigation";
import CoachShell from "@/components/coach/CoachShell";
import ThemeScope from "@/components/ui/ThemeScope";
import { getSession, signOutLeftoverAuthUser } from "@/lib/auth";
import { COMPANY } from "@/lib/company";

export const metadata = {
  title: `Coach — ${COMPANY.product}`,
};

// Coach console stays dark in v1 (spec §2). Explicit, so it never depends on :root.
export const viewport: Viewport = { themeColor: "#0A0A0B", colorScheme: "dark" };

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getSession();
  if (!member) {
    const leftover = await signOutLeftoverAuthUser();
    redirect(leftover ? "/login?err=invite" : "/login");
  }
  if (!member.isCoach) redirect("/dashboard");
  return (
    <ThemeScope theme="nat" className="flex flex-1 flex-col">
      <CoachShell member={member}>{children}</CoachShell>
    </ThemeScope>
  );
}
