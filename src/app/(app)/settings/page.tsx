import { redirect } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import { getMemberSettings } from "@/lib/data/settings";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const settings = await getMemberSettings(member.id);
  if (!settings) redirect("/dashboard");

  return (
    <>
      <PageHeader
        eyebrow="Indstillinger"
        title="Din konto"
        subtitle="Profil, notifikationer, data og konto-sletning. Alt under dine egne fingre."
      />
      <Container className="py-8 lg:py-12">
        <SettingsClient settings={settings} />
      </Container>
    </>
  );
}
