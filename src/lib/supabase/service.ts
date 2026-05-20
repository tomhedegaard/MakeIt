/**
 * Service-role Supabase client — SERVER-ONLY.
 *
 * Never import this into a client component: it carries the
 * service-role key, which bypasses Row Level Security entirely.
 *
 * Use it for server-side background work that must write tables
 * members cannot (e.g. the WHOOP OAuth callback and the HRV sync
 * cron writing OAuth tokens to `hrv_wearable_connections`).
 *
 * Unlike `server.ts` / `client.ts`, this is a plain
 * `@supabase/supabase-js` client with no cookie/session handling.
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Creates a Supabase client authenticated with the service-role key.
 *
 * Throws if `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`
 * is unset — we never return a half-configured client that would
 * fail opaquely later.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "createServiceClient: NEXT_PUBLIC_SUPABASE_URL is not set."
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "createServiceClient: SUPABASE_SERVICE_ROLE_KEY is not set."
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
