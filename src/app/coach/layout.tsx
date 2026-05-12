import { redirect } from "next/navigation";
import CoachShell from "@/components/coach/CoachShell";
import { getSession } from "@/lib/auth";
import { COMPANY } from "@/lib/company";

export const metadata = {
  title: `Coach — ${COMPANY.product}`,
};

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!member.isCoach) redirect("/dashboard");
  return <CoachShell member={member}>{children}</CoachShell>;
}
