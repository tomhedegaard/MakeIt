import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasAcknowledgedMentalDisclaimer } from "@/lib/data/mind";

/**
 * `/mind` entrypoint.
 *
 * Gates the rest of the pillar behind the one-time disclaimer.
 * Once acknowledged, today's surface (`/mind/today` in MH-7) is the
 * landing — for now we redirect to `/mind/check` since MH-2 lands first.
 */
export default async function MindRootPage() {
  const member = await getSession();
  if (!member) redirect("/login");

  const acknowledged = await hasAcknowledgedMentalDisclaimer(member.id);
  if (!acknowledged) redirect("/mind/onboarding");

  redirect("/mind/check");
}
