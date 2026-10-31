import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { getMemberSettings, getMemberHrvSettings } from "@/lib/data/settings";
import SettingsClient from "./SettingsClient";
import BodySettingsSection from "@/components/settings/BodySettingsSection";
import { getMemberBody } from "@/lib/data/body";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { hasAdultConfirmation } from "@/lib/auth/age";
import { youthClaimsFor } from "@/lib/youth/account";

export default async function SettingsPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const [settings, hrv, body, youth, adultConfirmed] = await Promise.all([
    getMemberSettings(member.id),
    getMemberHrvSettings(member.id),
    getMemberBody(member.id),
    SUPABASE_ENABLED ? youthClaimsFor(member.id) : null,
    adultConfirmedNow(),
  ]);
  if (!settings) redirect("/dashboard");

  const t = await getTranslations("Settings.header");

  return (
    <>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        subtitle={t("subtitle")}
      />
      <Container className="py-8 lg:py-12">
        <SettingsClient
          settings={settings}
          hrv={hrv}
          vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
          body={
            // MakeIt Ung has no kcal, body weight or pejlemærke at all.
            youth ? null : <BodySettingsSection body={body} adultConfirmed={adultConfirmed} />
          }
        />
      </Container>
    </>
  );
}

/** The signed-in user's 18+ confirmation (auth metadata, #126). Demo counts as confirmed. */
async function adultConfirmedNow(): Promise<boolean> {
  if (!SUPABASE_ENABLED) return true;
  const supabase = await createClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getUser();
  return hasAdultConfirmation(data.user?.user_metadata);
}
