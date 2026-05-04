import Container from "@/components/Container";

export default function CrewSection() {
  return (
    <section id="crew" className="relative py-24 md:py-40">
      <Container>
        <div className="grid gap-16 md:grid-cols-12">
          <div className="md:col-span-4" data-reveal>
            <div className="eyebrow mb-4">01 — Crewet</div>
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)]">
              Et lukket
              <br /> rum for
              <br /> dem der
              <br /> løfter.
            </h2>
          </div>

          <div className="md:col-span-7 md:col-start-6 space-y-10">
            <p
              className="text-xl md:text-2xl leading-relaxed text-fg/90"
              data-reveal
              style={{ transitionDelay: "120ms" }}
            >
              MakeIt Crew er ikke for alle. Det er for atleter, coaches og samarbejdspartnere
              der allerede bygger sammen med os — og som vil have adgang til programmer,
              fællesskab og fordele før alle andre.
            </p>

            <ul className="grid sm:grid-cols-2 gap-6">
              {[
                {
                  k: "Inviteret adgang",
                  v: "Kun via personlig kode fra Anton eller en eksisterende crew-medlem.",
                },
                {
                  k: "Bygget internt",
                  v: "Vi udvikler platformen sammen med jer. Jeres feedback er featurerne.",
                },
                {
                  k: "Ingen støj",
                  v: "Ingen ads, ingen krav om at performe på Instagram. Bare træning og fællesskab.",
                },
                {
                  k: "Fri af shoppen",
                  v: "Webshoppen kører videre uberørt — det her er noget for sig.",
                },
              ].map((it, i) => (
                <li
                  key={it.k}
                  data-reveal
                  style={{ transitionDelay: `${200 + i * 80}ms` }}
                  className="surface-2 p-6 lift"
                >
                  <div className="eyebrow mb-3">{it.k}</div>
                  <p className="text-fg-dim text-sm leading-relaxed">{it.v}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
