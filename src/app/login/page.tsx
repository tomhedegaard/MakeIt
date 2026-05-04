import Link from "next/link";
import Logo from "@/components/Logo";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { isValidInvite, SESSION_COOKIE } from "@/lib/auth";

export const metadata = {
  title: "Log ind — MakeIt",
};

async function login(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "");
  if (!isValidInvite(code)) {
    redirect("/login?err=1");
  }
  const c = await cookies();
  c.set(SESSION_COOKIE, code.trim().toUpperCase(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;
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

        <p className="text-fg-dim mb-10 leading-relaxed">
          Indtast din invite-kode for at få adgang. Har du ikke en?
          Skriv til{" "}
          <a className="underline hover:text-fg" href="mailto:anton@nowmakeit.eu">
            anton@nowmakeit.eu
          </a>
          .
        </p>

        <form action={login} className="space-y-4">
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

        <p className="mt-10 text-xs text-fg-faint font-mono uppercase tracking-[0.14em]">
          Test-koder under beta: <span className="text-fg-dim">ANTON-01 · MAKEIT-CREW · STRAPIT-50K</span>
        </p>
      </div>
    </main>
  );
}
