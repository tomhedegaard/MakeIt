"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";

export async function logoutAction() {
  if (SUPABASE_ENABLED) {
    const supabase = await createClient();
    if (supabase) await supabase.auth.signOut();
  } else {
    const c = await cookies();
    c.delete(SESSION_COOKIE);
  }
  redirect("/");
}
