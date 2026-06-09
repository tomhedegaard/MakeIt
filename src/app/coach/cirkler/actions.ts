"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { addMemberToCirkel, createCirkel } from "@/lib/data/mind";

const CreateSchema = z.object({
  name: z.string().min(2).max(80),
  leader_id: z.string().uuid().nullable().optional(),
  max_members: z.coerce.number().int().min(3).max(10).default(6),
});

export async function createCirkelAction(
  formData: FormData,
): Promise<{ ok: true; id: string } | { error: string }> {
  const member = await getSession();
  if (!member || !member.isAdmin) return { error: "not_admin" };

  const parsed = CreateSchema.safeParse({
    name: formData.get("name"),
    leader_id: (formData.get("leader_id") as string | null) || null,
    max_members: formData.get("max_members") ?? 6,
  });
  if (!parsed.success) return { error: "invalid_input" };

  const result = await createCirkel({
    name: parsed.data.name,
    leaderId: parsed.data.leader_id ?? null,
    maxMembers: parsed.data.max_members,
  });

  if (!result.ok) return { error: result.error };

  console.info("[coach/cirkler] created", {
    munkId: member.id,
    cirkelId: result.id,
    name: parsed.data.name,
  });

  revalidatePath("/coach/cirkler");
  return { ok: true, id: result.id };
}

const AddMemberSchema = z.object({
  cirkel_id: z.string().uuid(),
  member_id: z.string().uuid(),
});

export async function addCirkelMemberAction(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const member = await getSession();
  if (!member || !member.isAdmin) return { error: "not_admin" };

  const parsed = AddMemberSchema.safeParse({
    cirkel_id: formData.get("cirkel_id"),
    member_id: formData.get("member_id"),
  });
  if (!parsed.success) return { error: "invalid_input" };

  const result = await addMemberToCirkel({
    cirkelId: parsed.data.cirkel_id,
    memberId: parsed.data.member_id,
  });
  if (!result.ok) return { error: result.error };

  console.info("[coach/cirkler] member added", {
    munkId: member.id,
    cirkelId: parsed.data.cirkel_id,
    memberId: parsed.data.member_id,
  });

  revalidatePath("/coach/cirkler");
  return { ok: true };
}
