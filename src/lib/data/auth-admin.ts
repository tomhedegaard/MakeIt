/**
 * Auth Admin helpers — connected mode, service-role, server-only.
 *
 * After an invite-validated password `signUp` that created a user
 * but returned no session (Supabase Confirm email ON), the invite
 * is the closed-beta gate. Confirm that one `auth.users` row so
 * `signInWithPassword` can establish a session.
 *
 * Never import from a client component.
 * Never confirm by email lookup / listUsers — only the signUp user id.
 * Never call unless `is_invite_valid` already returned true.
 */
import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type EmailConfirmAdmin = {
  auth: {
    admin: {
      updateUserById: (
        uid: string,
        attrs: { email_confirm: boolean },
      ) => Promise<{
        data: { user: { email_confirmed_at?: string | null } | null };
        error: { message?: string } | null;
      }>;
    };
  };
};

export async function confirmAuthUserEmail(
  userId: string,
  client?: EmailConfirmAdmin,
): Promise<boolean> {
  if (!userId) return false;
  try {
    const svc = client ?? createServiceClient();
    const { data, error } = await svc.auth.admin.updateUserById(userId, {
      email_confirm: true,
    });
    if (error) return false;
    return Boolean(data.user?.email_confirmed_at);
  } catch {
    return false;
  }
}
