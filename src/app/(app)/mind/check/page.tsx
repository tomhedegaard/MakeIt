import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { hasAcknowledgedMentalDisclaimer } from "@/lib/data/mind";

/**
 * `/mind/check` — MH-2 wires the real 60-second flow here.
 *
 * MH-1 ships a placeholder so the disclaimer's "fortsæt" lands somewhere
 * sensible. Linked off the disclaimer accept action.
 */
export default async function MindCheckPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const t = await getTranslations("Mind.nav");

  return (
    <>
      <PageHeader
        eyebrow="Mind · Søjle 5"
        title="Mind-check kommer i MH-2."
        subtitle={`Velkommen, ${member.handle}. Skemaet og din mentale graf lander i næste fase.`}
      />
      <Container size="narrow" className="py-12">
        <p className="text-fg-dim leading-relaxed">
          Du er gennem disclaimer-step. Dit access til hele Mind-modulet er
          låst op. Næste fase (MH-2) tilføjer den 60-sekunders daglige
          mind-check + 30-dages mental graf på denne side.
        </p>
        <ul className="mt-6 text-fg-dim text-sm space-y-1">
          <li>· {t("today")}</li>
          <li>· {t("journal")}</li>
          <li>· {t("sessions")}</li>
          <li>· {t("settings")}</li>
        </ul>
      </Container>
    </>
  );
}
