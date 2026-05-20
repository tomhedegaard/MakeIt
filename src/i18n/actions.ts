"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, type Locale } from "./config";

export async function setLocaleAction(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  // Best-effort: persist to the member row so the choice follows the
  // user onto other devices. The cookie above stays the render-time
  // source of truth — any DB failure here is intentionally ignored.
  const supabase = await createClient();
  if (!supabase) return;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("members").update({ locale }).eq("id", user.id);
}
