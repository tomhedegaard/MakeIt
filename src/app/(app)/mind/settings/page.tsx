import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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

export async function generateMetadata() {
  const t = await getTranslations("Mind.settingsPage");
  return { title: t("metaTitle") };
}

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
  const t = await getTranslations("Mind.settingsPage");

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container size="narrow" className="py-10 md:py-14 space-y-12">
        <section>
          <h2 className="font-display text-xl mb-2">{t("crew.title")}</h2>
          <p className="text-fg-dim text-sm mb-4">{t("crew.body")}</p>
          <div className="space-y-0">
            <MentalToggleRow
              field="buddy_share_enabled"
              initialValue={settings.buddy_share_enabled}
              title={t("buddyShare.title")}
              description={t("buddyShare.description")}
              disabled={!buddyEligible}
              disabledReason={
                !buddy
                  ? t("buddyShare.noBuddy")
                  : member.tier === "Lifter"
                    ? t("buddyShare.tierLocked")
                    : undefined
              }
            />
            <MentalToggleRow
              field="cirkel_share_aggregate_enabled"
              initialValue={settings.cirkel_share_aggregate_enabled}
              title={t("cirkelAggregate.title")}
              description={t("cirkelAggregate.description")}
              disabled={!cirkelEligible}
              disabledReason={
                cirkelEligible ? undefined : t("cirkelLocked")
              }
            />
            <MentalToggleRow
              field="cirkel_share_daily_enabled"
              initialValue={settings.cirkel_share_daily_enabled}
              title={t("cirkelDaily.title")}
              description={t("cirkelDaily.description")}
              disabled={!cirkelEligible}
              disabledReason={
                cirkelEligible ? undefined : t("cirkelLocked")
              }
            />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">{t("aiCoach.title")}</h2>
          <div className="space-y-0">
            <MentalToggleRow
              field="ai_coach_enabled"
              initialValue={settings.ai_coach_enabled}
              title={t("aiCoach.rowTitle")}
              description={t("aiCoach.rowDescription")}
            />
          </div>
        </section>

        <section>
          <h2 className="font-display text-xl mb-2">{t("notifications.title")}</h2>
          <div className="space-y-0">
            <MentalToggleRow
              field="notif_mind_check_evening"
              initialValue={settings.notif_mind_check_evening}
              title={t("notifications.evening.title")}
              description={t("notifications.evening.description")}
            />
            <MentalToggleRow
              field="notif_ai_coach_morning"
              initialValue={settings.notif_ai_coach_morning}
              title={t("notifications.morning.title")}
              description={t("notifications.morning.description")}
            />
            <MentalToggleRow
              field="notif_buddy_mental_alert"
              initialValue={settings.notif_buddy_mental_alert}
              title={t("notifications.buddy.title")}
              description={t("notifications.buddy.description")}
            />
          </div>
        </section>

        <div className="text-xs text-fg-dim pt-4">
          {t("streak", {
            current: settings.current_streak_days,
            longest: settings.longest_streak_days,
          })}
        </div>
      </Container>
    </>
  );
}
