"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from "./env";

export function createClient() {
  if (!SUPABASE_ENABLED) return null;
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
