import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";
import {
  mockLoginAction,
  magicLinkAction,
  passwordAction,
  oauthAction,
} from "./actions";
import { PUBLIC_ACCESS_HREF } from "@/lib/marketing/public-cta";

export async function generateMetadata() {
  const t = await getTranslations("Login");
  return { title: t("metaTitle", { product: COMPANY.product }) };
}

type Tab = "magic" | "password" | "oauth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    err?: string;
    sent?: string;
    email?: string;
    tab?: Tab;
    mode?: string;
  }>;
}) {
  const { err, sent, email, tab = "magic", mode = "signin" } = await searchParams;
  const t = await getTranslations("Login");

  return (
    <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,242,236,0.08),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-12 flex items-center justify-between">
          <Link href="/" className="inline-block text-fg">
            <Logo />
          </Link>
          <LanguageSelector />
        </div>

        <div className="eyebrow mb-3 flex items-center gap-2">
          <span className="pulse-dot" /> {t("beta")}
        </div>

        <h1 className="font-display text-5xl md:text-6xl mb-4">
          {t("headline.line1")}
          <br /> {t("headline.line2")}
        </h1>

        {sent ? (
          <SentState email={email} />
        ) : SUPABASE_ENABLED ? (
          <SupabaseForm err={err} tab={tab} mode={mode as "signin" | "signup"} />
        ) : (
          <MockForm err={err} />
        )}

        {!sent ? (
          <p className="mt-6 text-sm text-fg-dim">
            {t("waitlistHint")}{" "}
            <a href={PUBLIC_ACCESS_HREF} className="underline hover:text-fg">
              {t("waitlistLink")}
            </a>
          </p>
        ) : null}

        <p className="mt-10 text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
          {SUPABASE_ENABLED ? (
            <>
              {t("statusConnected")}
              {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "").split(".")[0]}
            </>
          ) : (
            <>{t("statusDemo")}</>
          )}
        </p>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- *
 * Mock (demo) form
 * ---------------------------------------------------------------- */

async function MockForm({ err }: { err?: string }) {
  const t = await getTranslations("Login.mock");
  return (
    <>
      <p className="text-fg-dim mb-10 leading-relaxed">
        {t("intro")}
        <a className="underline hover:text-fg" href={SUPPORT_MAILTO}>
          {COMPANY.emails.support}
        </a>
        .
      </p>

      <form action={mockLoginAction} className="space-y-4">
        <label className="block">
          <span className="eyebrow block mb-2">{t("inviteCodeLabel")}</span>
          <input
            name="code"
            required
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="MUNK-01"
            className="field"
          />
        </label>

        {err ? <LoginErrorAlert>{t("invalidCode")}</LoginErrorAlert> : null}

        <button type="submit" className="btn btn-primary w-full mt-2">
          {t("submit")}
        </button>
      </form>

      <p className="mt-6 text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
        {t("testCodesLabel")}<span className="text-fg-dim">MUNK-01 · MAKEIT-CREW · STRAPIT-50K</span>
      </p>
    </>
  );
}

/* ---------------------------------------------------------------- *
 * Connected (Supabase) form — three tabs
 * ---------------------------------------------------------------- */

async function SupabaseForm({
  err,
  tab,
  mode,
}: {
  err?: string;
  tab: Tab;
  mode: "signin" | "signup";
}) {
  const t = await getTranslations("Login.errors");
  const errLabel = err
    ? t.has(err)
      ? t(err)
      : t("fallback")
    : null;

  return (
    <>
      <TabBar active={tab} />

      {errLabel ? (
        <LoginErrorAlert className="mb-4">{errLabel}</LoginErrorAlert>
      ) : null}

      {tab === "password" ? (
        <PasswordForm mode={mode} />
      ) : tab === "oauth" ? (
        <OAuthForm />
      ) : (
        <MagicLinkForm />
      )}
    </>
  );
}

async function TabBar({ active }: { active: Tab }) {
  const t = await getTranslations("Login.tabs");
  const tabs: { key: Tab; label: string }[] = [
    { key: "magic", label: t("magic") },
    { key: "password", label: t("password") },
    { key: "oauth", label: t("oauth") },
  ];
  return (
    <div className="flex gap-1 mb-6 surface-2 rounded-lg p-1 text-xs font-mono uppercase tracking-[0.14em]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={`/login?tab=${t.key}`}
          className={`flex-1 text-center px-3 py-2 rounded-md transition-colors ${
            active === t.key
              ? "bg-bg-3 text-fg"
              : "text-fg-dim hover:text-fg"
          }`}
          scroll={false}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

async function MagicLinkForm() {
  const t = await getTranslations("Login.magic");
  return (
    <>
      <p className="text-fg-dim mb-6 leading-relaxed">
        {t("intro")}
      </p>

      <form action={magicLinkAction} className="space-y-4">
        <label className="block">
          <span className="eyebrow block mb-2">{t("emailLabel")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            placeholder={t("emailPlaceholder")}
            className="field"
          />
        </label>

        <label className="block">
          <span className="eyebrow block mb-2">{t("inviteCodeLabel")}</span>
          <input
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="MUNK-01"
            className="field"
          />
        </label>

        <button type="submit" className="btn btn-primary w-full mt-2">
          {t("submit")}
        </button>
      </form>
    </>
  );
}

async function PasswordForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  const t = await getTranslations("Login.password");
  return (
    <>
      <p className="text-fg-dim mb-6 leading-relaxed">
        {isSignup ? t("introSignup") : t("introSignin")}
      </p>

      <form action={passwordAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />

        <label className="block">
          <span className="eyebrow block mb-2">{t("emailLabel")}</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            placeholder={t("emailPlaceholder")}
            className="field"
          />
        </label>

        <label className="block">
          <span className="eyebrow block mb-2">{t("passwordLabel")}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder={t("passwordPlaceholder")}
            className="field"
          />
        </label>

        {isSignup ? (
          <label className="block">
            <span className="eyebrow block mb-2">{t("inviteCodeLabel")}</span>
            <input
              name="code"
              required
              autoComplete="off"
              spellCheck={false}
              placeholder="MUNK-01"
              className="field"
            />
          </label>
        ) : null}

        <button type="submit" className="btn btn-primary w-full mt-2">
          {isSignup ? t("submitSignup") : t("submitSignin")}
        </button>
      </form>

      <p className="mt-4 text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
        {isSignup ? (
          <>
            {t("hasAccount")}{" "}
            <Link
              href="/login?tab=password&mode=signin"
              className="underline hover:text-fg"
              scroll={false}
            >
              {t("signinLink")}
            </Link>
          </>
        ) : (
          <>
            {t("newHere")}{" "}
            <Link
              href="/login?tab=password&mode=signup"
              className="underline hover:text-fg"
              scroll={false}
            >
              {t("signupLink")}
            </Link>
          </>
        )}
      </p>
    </>
  );
}

async function OAuthForm() {
  const t = await getTranslations("Login.oauth");
  return (
    <>
      <p className="text-fg-dim mb-6 leading-relaxed">
        {t("intro")}
      </p>

      <form action={oauthAction} className="space-y-4">
        <label className="block">
          <span className="eyebrow block mb-2">{t("inviteCodeLabel")}</span>
          <input
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            placeholder="MUNK-01"
            className="field"
          />
        </label>

        <div className="grid grid-cols-1 gap-3 mt-2">
          <button
            type="submit"
            name="provider"
            value="google"
            className="btn btn-ghost w-full justify-center gap-3"
          >
            <GoogleGlyph /> {t("continueGoogle")}
          </button>
          <button
            type="submit"
            name="provider"
            value="apple"
            className="btn btn-ghost w-full justify-center gap-3"
          >
            <AppleGlyph /> {t("continueApple")}
          </button>
        </div>
      </form>
    </>
  );
}

function LoginErrorAlert({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={`flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm font-mono uppercase tracking-[0.14em] text-danger ${className}`}
    >
      <DangerGlyph />
      <span>{children}</span>
    </p>
  );
}

function DangerGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#FFC107"
        d="M21.6 12.227c0-.812-.073-1.418-.231-2.046h-9.165v3.71h5.382c-.108.917-.694 2.298-1.997 3.226l-.018.121 2.9 2.247.2.02c1.846-1.703 2.93-4.21 2.93-7.278z"
      />
      <path
        fill="#FF3D00"
        d="M12.204 21.6c2.638 0 4.853-.866 6.471-2.36l-3.082-2.388c-.825.575-1.932.978-3.39.978-2.585 0-4.78-1.703-5.563-4.057l-.115.01-3.018 2.337-.04.11C4.475 19.27 8.05 21.6 12.205 21.6z"
      />
      <path
        fill="#4CAF50"
        d="M6.642 13.773c-.207-.628-.327-1.302-.327-1.997 0-.696.12-1.369.316-1.997l-.005-.134-3.056-2.374-.1.048A9.589 9.589 0 0 0 2.4 11.776c0 1.555.379 3.022 1.07 4.456l3.172-2.46z"
      />
      <path
        fill="#1976D2"
        d="M12.204 5.722c1.834 0 3.071.79 3.778 1.451l2.756-2.69C17.046 3.034 14.842 2.4 12.204 2.4c-4.155 0-7.73 2.33-9.464 5.97l3.16 2.46c.795-2.354 2.99-4.108 6.304-4.108z"
      />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="currentColor">
      <path d="M16.365 1.43c0 1.14-.42 2.22-1.225 3.07-.96 1.02-2.51 1.78-3.78 1.66-.16-1.13.43-2.34 1.21-3.16.83-.85 2.27-1.5 3.7-1.6.06.01.06.01.095.03zM20.5 17.05c-.5 1.16-.74 1.68-1.39 2.7-.91 1.42-2.18 3.19-3.78 3.21-1.42.02-1.79-.93-3.72-.92-1.93.01-2.34.94-3.76.92-1.6-.02-2.81-1.62-3.72-3.04-2.55-3.97-2.82-8.62-1.25-11.1 1.12-1.74 2.88-2.76 4.54-2.76 1.69 0 2.76.93 4.16.93 1.36 0 2.19-.93 4.15-.93 1.48 0 3.05.81 4.16 2.21-3.66 2.01-3.06 7.24.61 8.78z" />
    </svg>
  );
}

/* ---------------------------------------------------------------- *
 * Sent confirmation (post-magic-link / post-signup)
 * ---------------------------------------------------------------- */

async function SentState({ email }: { email?: string }) {
  const t = await getTranslations("Login.sent");
  return (
    <div className="surface-2 rounded-2xl p-6">
      <div className="eyebrow mb-3">{t("eyebrow")}</div>
      <p className="text-fg-dim leading-relaxed mb-4">
        {t("body")}
        <span className="text-fg">{email ?? t("fallbackEmail")}</span>
        {t("bodyTail")}
      </p>
      <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
        {t("expiry")}
      </p>
    </div>
  );
}
