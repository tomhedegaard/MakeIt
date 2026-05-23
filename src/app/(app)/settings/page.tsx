import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { getMemberSettings, getMemberHrvSettings } from "@/lib/data/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const [settings, hrv] = await Promise.all([
    getMemberSettings(member.id),
    getMemberHrvSettings(member.id),
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
        />
      </Container>
    </>
  );
}
