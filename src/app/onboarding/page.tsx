import { redirect } from "next/navigation";
import { getSession, type Member } from "@/lib/auth";
import OnboardingClient from "./OnboardingClient";

export const metadata = {
  title: "Velkommen — MakeIt // HQ",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const member = await getSession();
  if (!member) redirect("/login");

  // Connected mode: if already onboarded, go straight to dashboard.
  // (Demo mode lets you replay the flow at /onboarding for design QA.)
  const m = member as Member & { onboardedAt?: string | null };
  if (m.onboardedAt) redirect("/dashboard");

  const { err } = await searchParams;
  return <OnboardingClient memberHandle={member.handle} err={err} />;
}
