import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { getCurrentPlan } from "@/lib/data/nutrition";
import SetupWizardClient from "./SetupWizardClient";

export const metadata = {
  title: "Sæt din meal plan op — MakeIt",
};

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

  return (
    <main className="relative z-10 flex-1 py-12 md:py-20">
      <Container size="narrow">
        <header className="mb-10">
          <div className="eyebrow mb-3">Setup · 90 sekunder</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,4rem)] leading-[0.95] mb-4">
            Sæt rammen.
            <br /> Vi bygger planen.
          </h1>
          <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md">
            Fire valg — så genererer AI&apos;en din første uge med opskrifter,
            macros og indkøbsliste. Du kan justere alt senere under
            indstillinger.
          </p>
        </header>

        <SetupWizardClient />
      </Container>
    </main>
  );
}
