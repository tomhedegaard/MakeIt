"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_ENABLED, SUPABASE_URL } from "@/lib/supabase/env";

export type ProfileUpdate = {
  handle: string;
  displayName: string;
  bio: string;
};

const HANDLE_RE = /^[a-zA-Z][a-zA-Z0-9_.-]{1,30}$/;

/** Update handle / display name / bio. Validates handle uniqueness. */
export async function updateProfileAction(input: ProfileUpdate): Promise<{
  ok: boolean;
  error?: "auth" | "handle_invalid" | "handle_taken" | "unknown";
}> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const handle = input.handle.trim();
  if (!HANDLE_RE.test(handle)) return { ok: false, error: "handle_invalid" };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "auth" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  // Uniqueness check (case-insensitive)
  const { data: clash } = await supabase
    .from("members")
    .select("id")
    .ilike("handle", handle)
    .neq("id", user.id)
    .maybeSingle();
  if (clash) return { ok: false, error: "handle_taken" };

  const { error } = await supabase
    .from("members")
    .update({
      handle,
      display_name: input.displayName.trim().slice(0, 100) || null,
      bio: input.bio.trim().slice(0, 500) || null,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: "unknown" };

  revalidatePath("/settings");
  revalidatePath("/profile");
  revalidatePath("/community");
  return { ok: true };
}

export type NotifPrefs = {
  notifFormCheckReview: boolean;
  notifMention: boolean;
  notifDigest: boolean;
  notifTierUp: boolean;
};

export async function updateNotifPrefsAction(
  prefs: NotifPrefs
): Promise<{ ok: boolean }> {
  if (!SUPABASE_ENABLED) return { ok: true };

  const supabase = await createClient();
  if (!supabase) return { ok: false };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabase
    .from("members")
    .update({
      notif_form_check_review: prefs.notifFormCheckReview,
      notif_mention: prefs.notifMention,
      notif_digest: prefs.notifDigest,
      notif_tier_up: prefs.notifTierUp,
    })
    .eq("id", user.id);

  if (error) return { ok: false };
  revalidatePath("/settings");
  return { ok: true };
}

/**
 * Permanent account delete. Uses the service role to remove the
 * auth.users row; the FK cascade tears down public.members and
 * everything that references it (sessions, posts, redemptions, etc).
 */
export async function deleteAccountAction(): Promise<{
  ok: boolean;
  error?: "auth" | "service_key_missing" | "unknown";
}> {
  if (!SUPABASE_ENABLED) {
    // Demo: just sign out (there's no real account to delete).
    redirect("/");
  }

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "auth" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth" };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { ok: false, error: "service_key_missing" };

  const admin = createSupabase(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return { ok: false, error: "unknown" };

  // Sign the (now-stale) browser session out
  await supabase.auth.signOut();
  redirect("/");
}
