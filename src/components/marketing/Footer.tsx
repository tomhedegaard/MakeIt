import Container from "@/components/Container";
import Logo from "@/components/Logo";
import Link from "next/link";

export default function MarketingFooter() {
  return (
    <footer className="relative border-t hairline">
      <Container>
        <div className="py-20 grid gap-16 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-6 text-fg-dim max-w-md text-sm leading-relaxed">
              MakeIt Members er det interne univers for vores crew, atleter og coaches.
              Webshoppen{" "}
              <a href="https://www.nowmakeit.eu" className="underline hover:text-fg">
                nowmakeit.eu
              </a>{" "}
              kører som altid — det her er noget for sig.
            </p>
          </div>

          <div className="md:col-span-3">
            <div className="eyebrow mb-4">Univers</div>
            <ul className="space-y-2.5 text-fg/85 text-sm">
              <li><a href="#crew">Crew</a></li>
              <li><a href="#coaching">Coaching</a></li>
              <li><a href="#community">Community</a></li>
              <li><a href="#reps">Reps Program</a></li>
            </ul>
          </div>

          <div className="md:col-span-4">
            <div className="eyebrow mb-4">Kontakt</div>
            <ul className="space-y-2.5 text-fg/85 text-sm">
              <li>Engvej 169, 2300 København S</li>
              <li><a href="mailto:anton@nowmakeit.eu">anton@nowmakeit.eu</a></li>
              <li><a href="https://www.instagram.com/makeiteu/">Instagram @makeiteu</a></li>
            </ul>

            <Link href="/login" className="btn btn-sm mt-6 inline-flex">Få adgang →</Link>
          </div>
        </div>

        <div className="py-6 border-t hairline flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-fg-faint uppercase tracking-[0.16em]">
          <span>© {new Date().getFullYear()} MakeIt Danmark ApS</span>
          <span>Made in DK · Closed Beta · v0.1</span>
        </div>
      </Container>
    </footer>
  );
}
