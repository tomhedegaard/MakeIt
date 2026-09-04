import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { hasAcknowledgedMentalDisclaimer } from "@/lib/data/mind";
import MindDisclaimer from "@/components/mind/MindDisclaimer";

export async function generateMetadata() {
  const t = await getTranslations("Mind.disclaimer");
  return { title: `${t("title")} · MakeIt` };
}

/**
 * `/mind/onboarding` — keep the path for old links. The tab lands on
 * `/mind`, which renders the same disclaimer in place (no hop).
 */
export default async function MindOnboardingPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  if (await hasAcknowledgedMentalDisclaimer(member.id)) {
    redirect("/mind");
  }

  return <MindDisclaimer />;
}
