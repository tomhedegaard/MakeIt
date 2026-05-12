import Container from "@/components/Container";
import { COMPANY } from "@/lib/company";

export default function OriginSection() {
  return (
    <section id="origin" className="relative py-32 md:py-48">
      <Container>
        <div className="grid gap-16 md:grid-cols-12 items-start">
          <div className="md:col-span-5" data-reveal>
            <div className="eyebrow mb-4">05 — Origin</div>
            <h2 className="font-display text-[clamp(2.6rem,7vw,6rem)] leading-[0.92]">
              Syet i
              <br /> København.
              <br /> Brugt overalt.
            </h2>
          </div>

          <div className="md:col-span-6 md:col-start-7 space-y-10" data-reveal style={{ transitionDelay: "120ms" }}>
            <p className="text-xl md:text-2xl leading-relaxed">
              StrapIt blev født af én simpel idé: hvis du tager træning seriøst, fortjener
              dit udstyr at gøre det samme. Vi syr stadig hver eneste strap selv, på Amagerbro,
              med dansk produceret nylon og kontrolsøm der holder i årtier.
            </p>

            <ul className="grid grid-cols-2 gap-px border hairline bg-line">
              {[
                { k: "Etableret",   v: "2018" },
                { k: "Sted",        v: COMPANY.legal.address ?? "København, Danmark" },
                { k: "Made in",     v: "Denmark" },
                { k: "Sælges hos",  v: "PureGym, SDU, Fitness Engros m.fl." },
                { k: "Garanti",     v: "100 dages retur" },
              ].map((row) => (
                <li key={row.k} className="bg-bg p-5">
                  <div className="eyebrow mb-2">{row.k}</div>
                  <div className="text-fg text-base">{row.v}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
