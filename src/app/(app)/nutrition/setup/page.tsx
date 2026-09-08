import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { getCurrentPlan } from "@/lib/data/nutrition";
import NutritionSetupView from "./NutritionSetupView";

export async function generateMetadata() {
  const t = await getTranslations("Nutrition.setup");
  return { title: t("metaTitle") };
}

/**
 * Setup-wizard for the meal planner. Renders only on first visit:
 * if the member already has a current plan, we bounce them to
 * /nutrition since they're past the wizard phase. Edits afterward
 * go through /nutrition/preferences which exposes the full
 * power-user form.
 *
 * The form itself is a client component (SetupWizardClient) so the
 * radio selection lights up immediately. Server-side we just gate
 * access and render the chrome.
 */
export default async function NutritionSetupPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const plan = await getCurrentPlan(member.id);
  if (plan !== null) redirect("/nutrition");

  return <NutritionSetupView />;
}
