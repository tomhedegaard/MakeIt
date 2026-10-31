import type { Viewport } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Logo from "@/components/Logo";
import ThemeScope from "@/components/ui/ThemeScope";
import { COMPANY } from "@/lib/company";
import { createClient } from "@/lib/supabase/server";
import { newPasswordAction } from "../actions";

export async function generateMetadata() {
  const t = await getTranslations("Login");
  return { title: t("metaTitle", { product: COMPANY.product }) };
}

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  colorScheme: "light",
};

/**
 * Landing for the reset mail: /auth/callback has exchanged the code,
 * so the member has a session and only needs to pick a new password.
 */
export default async function NewPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect("/login?tab=password&mode=reset&err=callback");

  const t = await getTranslations("Login.newPassword");
  const te = await getTranslations("Login.errors");
  const errLabel = err ? (te.has(err) ? te(err) : te("fallback")) : null;

  return (
    <ThemeScope theme="nord" className="flex-1 flex flex-col">
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-12">
            <Link href="/" className="inline-block text-fg">
              <Logo />
            </Link>
          </div>

          <div className="eyebrow mb-3">{t("eyebrow")}</div>
          <p className="text-fg-dim mb-6 leading-relaxed">{t("intro")}</p>

          {errLabel ? (
            <p
              role="alert"
              className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-copy text-danger"
            >
              {errLabel}
            </p>
          ) : null}

          <form action={newPasswordAction} className="space-y-4">
            {/* Lets password managers file the new password under the account. */}
            <input type="hidden" name="username" autoComplete="username" value={user.email ?? ""} />
            <label className="block">
              <span className="eyebrow block mb-2">{t("passwordLabel")}</span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder={t("passwordPlaceholder")}
                className="field"
              />
            </label>

            <button type="submit" className="btn btn-primary w-full mt-2">
              {t("submit")}
            </button>
          </form>
        </div>
      </main>
    </ThemeScope>
  );
}
