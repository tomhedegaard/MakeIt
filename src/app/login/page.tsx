import Link from "next/link";
import Logo from "@/components/Logo";
import BrandHeading from "@/components/BrandHeading";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  mockLoginAction,
  magicLinkAction,
  passwordAction,
  oauthAction,
} from "./actions";

export const metadata = {
  title: "Log ind — MakeIt // HQ",
};

type Tab = "magic" | "password" | "oauth";

const ERR_LABELS: Record<string, string> = {
  "1":         "Noget gik galt — prøv igen",
  missing:     "Email og kode kræves",
  invite:      "Ugyldig invite-kode",
  otp:         "Kunne ikke sende mail — prøv igen",
  pw_short:    "Passwordet skal være mindst 8 tegn",
  exists:      "Email er allerede registreret — log ind i stedet",
  signup:      "Kunne ikke oprette konto — prøv igen",
  creds:       "Forkert email eller password",
  signin:      "Kunne ikke logge ind — prøv igen",
  oauth:       "OAuth-flow fejlede — prøv igen",
  provider:    "Ukendt provider",
  callback:    "Login-link udløbet eller ugyldigt",
  disabled:    "Backend ikke tilkoblet",
};

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

  return (
    <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-24">
      <div className="absolute inset-0 -z-0 pointer-events-none">
        <div className="absolute left-1/2 top-1/2 h-[640px] w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(245,242,236,0.08),transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="inline-block mb-12 text-fg">
          <Logo />
        </Link>

        <div className="eyebrow mb-3 flex items-center gap-2">
          <span className="pulse-dot" /> Closed Beta · Invite only
        </div>

        <BrandHeading className="font-display text-5xl md:text-6xl mb-4">
          Velkommen
          <br /> til crewet.
        </BrandHeading>

        {sent ? (
          <SentState email={email} />
        ) : SUPABASE_ENABLED ? (
          <SupabaseForm err={err} tab={tab} mode={mode as "signin" | "signup"} />
        ) : (
          <MockForm err={err} />
        )}

        <p className="mt-10 text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
          {SUPABASE_ENABLED ? (
            <>
              Connected ·{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "").split(".")[0]}
            </>
          ) : (
            <>Demo mode · ingen backend tilkoblet</>
          )}
        </p>
      </div>
    </main>
  );
}

/* ---------------------------------------------------------------- *
 * Mock (demo) form
 * ---------------------------------------------------------------- */

function MockForm({ err }: { err?: string }) {
  return (
    <>
      <p className="text-fg-dim mb-10 leading-relaxed">
        Indtast din invite-kode for at få adgang. Har du ikke en?
        Skriv til{" "}
        <a className="underline hover:text-fg" href="mailto:munk@nowmakeit.eu">
          munk@nowmakeit.eu
        </a>
        .
      </p>

      <form action={mockLoginAction} className="space-y-4">
        <label className="block">
          <span className="eyebrow block mb-2">Invite-kode</span>
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

        {err ? (
          <p className="text-sm text-fg font-mono uppercase tracking-[0.14em]">
            · Ugyldig kode — prøv igen
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full mt-2">
          Få adgang →
        </button>
      </form>

      <p className="mt-6 text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
        Test-koder: <span className="text-fg-dim">MUNK-01 · MAKEIT-CREW · STRAPIT-50K</span>
      </p>
    </>
  );
}

/* ---------------------------------------------------------------- *
 * Connected (Supabase) form — three tabs
 * ---------------------------------------------------------------- */

function SupabaseForm({
  err,
  tab,
  mode,
}: {
  err?: string;
  tab: Tab;
  mode: "signin" | "signup";
}) {
  const errLabel = err ? ERR_LABELS[err] ?? "Noget gik galt — prøv igen" : null;

  return (
    <>
      <TabBar active={tab} />

      {errLabel ? (
        <p
          className="mb-4 text-sm font-mono uppercase tracking-[0.14em] text-red-400"
          role="alert"
        >
          · {errLabel}
        </p>
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

function TabBar({ active }: { active: Tab }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: "magic", label: "Magic link" },
    { key: "password", label: "Password" },
    { key: "oauth", label: "Google / Apple" },
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

function MagicLinkForm() {
  return (
    <>
      <p className="text-fg-dim mb-6 leading-relaxed">
        Indtast email + invite-kode. Vi sender et engangs-login-link.
      </p>

      <form action={magicLinkAction} className="space-y-4">
        <label className="block">
          <span className="eyebrow block mb-2">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            placeholder="dig@email.com"
            className="field"
          />
        </label>

        <label className="block">
          <span className="eyebrow block mb-2">Invite-kode</span>
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
          Send login-link →
        </button>
      </form>
    </>
  );
}

function PasswordForm({ mode }: { mode: "signin" | "signup" }) {
  const isSignup = mode === "signup";
  return (
    <>
      <p className="text-fg-dim mb-6 leading-relaxed">
        {isSignup
          ? "Opret en konto med email + password. Invite-kode kræves."
          : "Log ind med email + password."}
      </p>

      <form action={passwordAction} className="space-y-4">
        <input type="hidden" name="mode" value={mode} />

        <label className="block">
          <span className="eyebrow block mb-2">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            placeholder="dig@email.com"
            className="field"
          />
        </label>

        <label className="block">
          <span className="eyebrow block mb-2">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={isSignup ? "new-password" : "current-password"}
            placeholder="Mindst 8 tegn"
            className="field"
          />
        </label>

        {isSignup ? (
          <label className="block">
            <span className="eyebrow block mb-2">Invite-kode</span>
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
          {isSignup ? "Opret konto →" : "Log ind →"}
        </button>
      </form>

      <p className="mt-4 text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
        {isSignup ? (
          <>
            Har du allerede en konto?{" "}
            <Link
              href="/login?tab=password&mode=signin"
              className="underline hover:text-fg"
              scroll={false}
            >
              Log ind
            </Link>
          </>
        ) : (
          <>
            Ny her?{" "}
            <Link
              href="/login?tab=password&mode=signup"
              className="underline hover:text-fg"
              scroll={false}
            >
              Opret konto
            </Link>
          </>
        )}
      </p>
    </>
  );
}

function OAuthForm() {
  return (
    <>
      <p className="text-fg-dim mb-6 leading-relaxed">
        Log ind eller opret konto med Google eller Apple. Invite-kode
        kræves uanset om du er ny eller eksisterende.
      </p>

      <form action={oauthAction} className="space-y-4">
        <label className="block">
          <span className="eyebrow block mb-2">Invite-kode</span>
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
            <GoogleGlyph /> Fortsæt med Google
          </button>
          <button
            type="submit"
            name="provider"
            value="apple"
            className="btn btn-ghost w-full justify-center gap-3"
          >
            <AppleGlyph /> Fortsæt med Apple
          </button>
        </div>
      </form>
    </>
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

function SentState({ email }: { email?: string }) {
  return (
    <div className="surface-2 rounded-2xl p-6">
      <div className="eyebrow mb-3">Mail sendt</div>
      <p className="text-fg-dim leading-relaxed mb-4">
        Vi har sendt et login-link til{" "}
        <span className="text-fg">{email ?? "din mail"}</span>. Åbn linket på samme
        enhed, så er du inde.
      </p>
      <p className="text-xs font-mono uppercase tracking-[0.14em] text-fg-faint">
        Linket virker i 1 time.
      </p>
    </div>
  );
}
