import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

const PROVIDERS = ["WHOOP", "ŌURA", "POLAR"] as const;

export default async function WorksWith() {
  const t = await getTranslations("Marketing.worksWith");

  return (
    <section className="relative border-t border-b hairline py-10 md:py-14">
      <Container>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-12">
          <div
            className="eyebrow eyebrow-domain shrink-0 flex items-center gap-2"
            data-domain="heart"
            data-reveal
          >
            <span className="size-1.5 rounded-full bg-domain" aria-hidden />
            {t("label")}
          </div>

          <ul
            className="flex flex-1 flex-wrap items-baseline gap-x-10 gap-y-3 md:gap-x-14"
            aria-label={t("label")}
          >
            {PROVIDERS.map((name, i) => (
              <li
                key={name}
                data-reveal
                style={{ transitionDelay: `${120 + i * 80}ms` }}
                className="font-display text-2xl md:text-3xl tracking-tight text-fg/70"
              >
                {name}
              </li>
            ))}
          </ul>

          <div
            data-reveal
            style={{ transitionDelay: "400ms" }}
            className="text-[11px] md:text-xs text-fg-faint font-mono uppercase tracking-[0.16em] shrink-0"
          >
            {t("note")}
          </div>
        </div>
      </Container>
    </section>
  );
}
