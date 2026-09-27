import type { Viewport } from "next";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import Logo from "@/components/Logo";
import ThemeScope from "@/components/ui/ThemeScope";
import { invitationView } from "@/lib/youth/guardianship";
import { acceptInvitationAction } from "./actions";

export const viewport: Viewport = { themeColor: "#FFFFFF", colorScheme: "light" };

export async function generateMetadata() {
  const t = await getTranslations("Youth.invite");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * The young member's side of MakeIt Ung (spec afsnit 2, 3 og 5): what
 * the guardian said yes to, what is and isn't in the app, exactly when
 * the guardian is told — and then their own consent and password.
 * Public route; the token is the key and is only stored hashed.
 */
export default async function YouthInvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ err?: string }>;
}) {
  const { token } = await params;
  const { err } = await searchParams;
  const t = await getTranslations("Youth.invite");
  const view = await invitationView(token);

  return (
    <ThemeScope theme="nord" className="flex-1">
      <main>
        <Container size="narrow" className="py-10 space-y-8">
          <Logo />
          {!view ? (
            <div className="space-y-3">
              <h1 className="font-display text-title">{t("invalidTitle")}</h1>
              <p className="text-copy text-fg-body">{t("invalidBody")}</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <p className="eyebrow">{t("eyebrow")}</p>
                <h1 className="font-display text-title">{t("title", { name: view.firstName, guardian: view.guardianName })}</h1>
                <p className="text-copy text-fg-body">{t("intro")}</p>
              </div>

              {err ? (
                <p role="alert" className="border hairline bg-bg-2 px-4 py-3 text-meta text-fg-body">
                  {t(`errors.${err}` as never)}
                </p>
              ) : null}

              <section className="space-y-2 border-t hairline pt-6">
                <h2 className="font-display text-section">{t("inTitle")}</h2>
                <ul className="list-disc pl-5 text-copy text-fg-body space-y-1">
                  <li>{t("inTraining")}</li>
                  <li>{t("inRecovery")}</li>
                  <li>{t("inFood")}</li>
                  <li>{t("inMind")}</li>
                </ul>
                <p className="text-meta text-fg-dim">{t("outBody")}</p>
              </section>

              <section className="space-y-2 border-t hairline pt-6">
                <h2 className="font-display text-section">{t("alertTitle")}</h2>
                <p className="text-copy text-fg-body">{t("alertAcute")}</p>
                <p className="text-copy text-fg-body">{t("alertConcern")}</p>
                <p className="text-meta text-fg-dim">{t("alertSeen")}</p>
              </section>

              <form action={acceptInvitationAction} className="space-y-4 border-t hairline pt-6">
                <input type="hidden" name="token" value={token} />
                <h2 className="font-display text-section">{t("consentTitle")}</h2>
                <p className="text-meta text-fg-dim">{t("consentTraining")}</p>
                {view.guardianConsentRecovery ? (
                  <Check name="consentRecovery" label={t("consentRecovery")} defaultChecked />
                ) : (
                  <p className="text-meta text-fg-dim">{t("guardianSaidNoRecovery")}</p>
                )}
                {view.guardianConsentMind ? (
                  <Check name="consentMind" label={t("consentMind")} defaultChecked />
                ) : (
                  <p className="text-meta text-fg-dim">{t("guardianSaidNoMind")}</p>
                )}

                <label className="block space-y-1.5">
                  <span className="text-meta">{t("email")}</span>
                  <input value={view.email} readOnly className="field text-fg-dim" />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-meta">{t("password")}</span>
                  <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
                </label>

                <Check name="consent" label={t("consent")} required />
                <button type="submit" className="btn btn-primary w-full">{t("create")}</button>
                <p className="text-micro text-fg-dim">{t("help")}</p>
              </form>
            </>
          )}
        </Container>
      </main>
    </ThemeScope>
  );
}

function Check({ name, label, required, defaultChecked }: { name: string; label: string; required?: boolean; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-3 text-meta">
      <input type="checkbox" name={name} required={required} defaultChecked={defaultChecked} className="mt-0.5 size-5 shrink-0 accent-fg" />
      <span>{label}</span>
    </label>
  );
}
