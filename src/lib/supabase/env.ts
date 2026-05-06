/**
 * Supabase config presence — we treat the platform as "demo mode"
 * when no env vars are set, falling back to the in-memory mock data
 * so the app keeps running locally without a backend.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const SUPABASE_ENABLED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
