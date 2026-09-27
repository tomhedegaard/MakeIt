"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { markNoticeSeen } from "@/lib/youth/notices";

/** The young member marks a notice to their guardian as seen. */
export async function acknowledgeNoticeAction(formData: FormData): Promise<void> {
  const member = await getSession();
  if (!member) return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  await markNoticeSeen(member.id, id);
  revalidatePath("/dashboard");
}
