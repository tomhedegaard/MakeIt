"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { acknowledgeMentalDisclaimer } from "@/lib/data/mind";

/**
 * Records the disclaimer acknowledgement, then forwards to /mind.
 * Demo mode writes a cookie; connected mode updates the members row.
 */
export async function acknowledgeMentalDisclaimerAction() {
  const member = await getSession();
  if (!member) redirect("/login");

  await acknowledgeMentalDisclaimer(member.id);

  console.info("[mind] disclaimer acknowledged", { memberId: member.id });

  redirect("/mind");
}
