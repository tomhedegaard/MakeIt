import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getOrCreateMentalSettings,
  hasAcknowledgedMentalDisclaimer,
  isBuddyShareEligible,
} from "@/lib/data/mind";
import { getMyBuddy } from "@/lib/data/buddy";
import MentalToggleRow from "@/components/mind/MentalToggleRow";

export const metadata = {
  title: "Indstillinger · Mind · MakeIt",
};

/**
 * `/mind/settings` — privacy + notification toggles for Søjle 5.
 *
 * Tier-gated toggles surface as disabled with an explainer until the
 * member levels up. The cirkler toggles unlock at Beast tier (MH-10).
 */
export default async function MindSettingsPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!(await hasAcknowledgedMentalDisclaimer(member.id))) {
    redirect("/mind/onboarding");
  }

  const [settings, buddy] = await Promise.all([
    getOrCreateMentalSettings(member.id),
    getMyBuddy(),
  ]);

  const buddyEligible = isBuddyShareEligible(member.tier, !!buddy);
  const cirkelEligible = member.tier === "Beast" || member.tier === "Legend";

  return (
    <>
      <PageHeader
        eyebrow="Mind · Indstillinger"
        title="Privatliv + notifikationer."
        subtitle="Din journal er altid privat. Resten kan du tænde og slukke for."
      />
      <Container size="narrow" className="py-10 md:py-14 space-y-12">
        <section>
          <h2 className="font-display text-xl mb-2">Crew-deling</h2>
          <p className="text-fg-dim text-sm mb-4">
            Hvad din buddy og dit cirkel ser. Begge sider skal sige ja.
          </p>
          <div className="space-y-0">
            <MentalToggleRow
              field="buddy_share_enabled"
              initialValue={settings.buddy_share_enabled}
              title="Del mind-check med min buddy"
              description="Din buddy ser dit signal (energi/stress/fokus) som tal — aldrig din journal. Kræver at buddy også siger ja."
              disabled={!buddyEligible}
              disabledReason={
                !buddy
                  ? "Du har ingen aktiv buddy lige nu."
                  : member.tier === "Lifter"
                    ? "Athlete-tier låser dette op."
                    : undefined
              }
            />
            <MentalToggleRow
              field="cirkel_share_aggregate_enabled"
              initialValue={settings.cirkel_share_aggregate_enabled}
              title="Del aggregeret signal med mit cirkel"
              description="Cirklets gennemsnit ser dit 7-dages snit. Ingen daglige tal."
              disabled={!cirkelEligible}
              disabledReason={
                cirkelEligible ? undefined : "Beast-tier låser cirkler op (MH-10)."
              }
            />
            <MentalToggleRow
              field="cirkel_share_daily_enabled"
              initialValue={settings.cirkel_share_daily_enabled}
              title="Del daglige tal med mit cirkel"
              description="Avanceret: dine daglige mind-check tal er synlige i cirklet. Kun hvis du virkelig vil."
              disabled={!cirkelEligible}
              disabledReason={
                cirkelEligible ? undefined : "Beast-tier låser cirkler op (MH-10)."
              }
            />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">AI mental coach</h2>
          <div className="space-y-0">
            <MentalToggleRow
              field="ai_coach_enabled"
              initialValue={settings.ai_coach_enabled}
              title="AI-coach daglige refleksion"
              description="Claude læser din mind-check, HRV og uge — skriver en kort daglig refleksion. Ingen adgang til din journal."
            />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">Notifikationer</h2>
          <div className="space-y-0">
            <MentalToggleRow
              field="notif_mind_check_evening"
              initialValue={settings.notif_mind_check_evening}
              title="Aften-mind-check nudge"
              description="20:00 lokal tid hvis du endnu ikke har tjekket ind."
            />
            <MentalToggleRow
              field="notif_ai_coach_morning"
              initialValue={settings.notif_ai_coach_morning}
              title="Morgen-refleksion push"
              description="06:30 lokal tid — AI-coachens daglige refleksion."
            />
            <MentalToggleRow
              field="notif_buddy_mental_alert"
              initialValue={settings.notif_buddy_mental_alert}
              title="Buddy-mental check-in"
              description="Hvis du og din buddy ikke har interageret i 7 dage og I begge har sagt ja til deling."
            />
          </div>
        </section>

        <div className="text-xs text-fg-dim pt-4">
          Streak: {settings.current_streak_days} dage · længste:{" "}
          {settings.longest_streak_days} dage.
        </div>
      </Container>
    </>
  );
}
