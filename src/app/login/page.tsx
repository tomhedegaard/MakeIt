import Link from "next/link";
import Logo from "@/components/Logo";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import { mockLoginAction, magicLinkAction } from "./actions";

export const metadata = {
  title: "Log ind — MakeIt // HQ",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; sent?: string; email?: string }>;
}) {
  const { err, sent, email } = await searchParams;

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

        <h1 className="font-display text-5xl md:text-6xl mb-4">
          Velkommen
          <br /> til crewet.
        </h1>

        {sent ? (
          <SentState email={email} />
        ) : SUPABASE_ENABLED ? (
          <SupabaseForm err={err} />
        ) : (
          <MockForm err={err} />
        )}

        <p className="mt-10 text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
          {SUPABASE_ENABLED ? (
            <>Connected · {process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "").split(".")[0]}</>
          ) : (
            <>Demo mode · ingen backend tilkoblet</>
          )}
        </p>
      </div>
    </main>
  );
}

function MockForm({ err }: { err?: string }) {
  return (
    <>
      <p className="text-fg-dim mb-10 leading-relaxed">
        Indtast din invite-kode for at få adgang. Har du ikke en?
        Skriv til{" "}
        <a className="underline hover:text-fg" href="mailto:anton@nowmakeit.eu">
          anton@nowmakeit.eu
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
            placeholder="ANTON-01"
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
        Test-koder: <span className="text-fg-dim">ANTON-01 · MAKEIT-CREW · STRAPIT-50K</span>
      </p>
    </>
  );
}

function SupabaseForm({ err }: { err?: string }) {
  return (
    <>
      <p className="text-fg-dim mb-10 leading-relaxed">
        Indtast din email + invite-kode. Vi sender dig et login-link straks.
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
            placeholder="ANTON-01"
            className="field"
          />
        </label>

        {err === "missing" ? (
          <p className="text-sm font-mono uppercase tracking-[0.14em]">· Email og kode kræves</p>
        ) : err === "invite" ? (
          <p className="text-sm font-mono uppercase tracking-[0.14em]">· Ugyldig invite-kode</p>
        ) : err === "otp" ? (
          <p className="text-sm font-mono uppercase tracking-[0.14em]">· Kunne ikke sende mail — prøv igen</p>
        ) : null}

        <button type="submit" className="btn btn-primary w-full mt-2">
          Send login-link →
        </button>
      </form>
    </>
  );
}

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
