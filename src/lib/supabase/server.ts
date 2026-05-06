import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_ENABLED, SUPABASE_URL } from "./env";

/**
 * Server-side Supabase client (RSCs, route handlers, server actions).
 * Returns null in demo mode so callers can fall back to mock data.
 */
export async function createClient() {
  if (!SUPABASE_ENABLED) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll() called from a Server Component — ignore.
          // The middleware refreshes cookies, so this is fine.
        }
      },
    },
  });
}
