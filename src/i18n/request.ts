import { cache } from "react";
import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, resolveLocale } from "./config";
import da from "../../messages/da";
import en from "../../messages/en";

const messagesByLocale = { da, en };

/** One members.locale read per request — cookie leftovers must not win. */
const readMemberLocale = cache(async (): Promise<string | null> => {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("members")
      .select("locale")
      .eq("id", user.id)
      .maybeSingle();
    return data?.locale ?? null;
  } catch {
    return null;
  }
});

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale({
    cookie: store.get(LOCALE_COOKIE)?.value,
    memberLocale: await readMemberLocale(),
  });

  return {
    locale,
    messages: messagesByLocale[locale],
  };
});
