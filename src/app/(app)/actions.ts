"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth";

export async function logoutAction() {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
  redirect("/");
}
