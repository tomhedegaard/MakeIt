import AppShell from "@/components/app/AppShell";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getSession();
  if (!member) redirect("/login");

  return <AppShell member={member}>{children}</AppShell>;
}
