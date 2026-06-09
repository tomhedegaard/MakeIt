import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getCirkelFeed,
  getMyCirkler,
  hasAcknowledgedMentalDisclaimer,
} from "@/lib/data/mind";
import CirkelPostForm from "@/components/mind/CirkelPostForm";
import CirkelFeed from "@/components/mind/CirkelFeed";

export const metadata = {
  title: "Cirkler · Mind · MakeIt",
};

/**
 * `/mind/cirkler` — Beast+ asynkron group check-ins (MH-10).
 *
 * Members of one or more cirkler see their feed + a post form for
 * each cirkel. Non-Beast tier hits a locked explainer.
 */
export default async function MindCirklerPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const beastOrLegend = member.tier === "Beast" || member.tier === "Legend";

  if (!beastOrLegend) {
    return (
      <>
        <PageHeader
          eyebrow="Mind · Cirkler"
          title="Beast-tier låser cirkler op."
          subtitle="Cirkler er små grupper (3-6 medlemmer) der laver ugentlige check-ins. Når du rykker til Beast, åbner det her sig."
        />
        <Container size="narrow" className="py-10">
          <p className="text-fg-dim leading-relaxed">
            Indtil da: hold fast i mind-check og journal hver dag — det er
            sådan Reps bygges op.
          </p>
        </Container>
      </>
    );
  }

  const cirkler = await getMyCirkler(member.id);

  if (cirkler.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Mind · Cirkler"
          title="Ingen cirkel endnu."
          subtitle="Munk opretter cirkler i grupper på 3-6. Du får besked når du er paret med en."
        />
      </>
    );
  }

  // Render the first cirkel inline. Future: multi-cirkel tabs.
  const first = cirkler[0]!;
  const feed = await getCirkelFeed(first.id, 30);

  return (
    <>
      <PageHeader
        eyebrow="Mind · Cirkler"
        title={first.name}
        subtitle={`${first.member_count} medlemmer · asynkron ugentlig check-in`}
      />
      <Container size="narrow" className="py-10 space-y-10">
        <CirkelPostForm cirkelId={first.id} />
        <CirkelFeed posts={feed} />

        {cirkler.length > 1 ? (
          <p className="text-fg-dim text-sm">
            Du er medlem af {cirkler.length} cirkler. Multi-cirkel-skifte
            kommer i en fast follow-up.
          </p>
        ) : null}
      </Container>
    </>
  );
}
