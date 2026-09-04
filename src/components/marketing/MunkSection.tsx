import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { COMPANY, SUPPORT_MAILTO } from "@/lib/company";
import { MUNK_HANDLE, MUNK_PORTRAIT_SRC } from "@/lib/marketing/munk";

/**
 * Public Munk presence. Strength-editorial, monochrome.
 * Copy is limited to facts already in the repo. The portrait slot
 * stays a placeholder until MUNK_PORTRAIT_SRC is a real asset.
 */
export default async function MunkSection() {
  const t = await getTranslations("Marketing.munk");

  return (
    <section id="munk" className="relative border-t hairline py-20 md:py-28">
      <Container>
        <div className="grid gap-12 md:grid-cols-12 items-start">
          <div className="md:col-span-5" data-reveal>
            <PortraitSlot label={t("photoPending")} note={t("photoPendingNote")} />
          </div>

          <div className="md:col-span-6 md:col-start-7" data-reveal>
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="font-display text-[clamp(2.4rem,6vw,5rem)] leading-[0.92] mb-3">
              {t("name")}
            </h2>
            <p className="text-fg text-lg md:text-xl leading-snug mb-5">
              {t("role")}
            </p>
            <p className="text-fg-dim text-base md:text-lg leading-relaxed max-w-md mb-8">
              {t("body")}
            </p>

            <ul className="space-y-5 border-t hairline">
              {(["formCheck", "signature", "access"] as const).map((key) => (
                <li key={key} className="border-b hairline py-4">
                  <div className="eyebrow mb-2">{t(`facts.${key}.k`)}</div>
                  <p className="text-sm md:text-base text-fg-dim leading-relaxed">
                    {t(`facts.${key}.v`)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="font-mono text-fg-faint uppercase tracking-[0.14em] text-[11px]">
                @{MUNK_HANDLE}
              </span>
              <a
                href={SUPPORT_MAILTO}
                className="underline underline-offset-4 text-fg-dim hover:text-fg"
              >
                {t("write", { email: COMPANY.emails.headCoach })}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function PortraitSlot({
  label,
  note,
}: {
  label: string;
  note: string;
}) {
  return (
    <div
      data-munk-portrait={MUNK_PORTRAIT_SRC ? "ready" : "missing"}
      className="relative w-full aspect-[4/5] surface-2 border hairline flex flex-col items-center justify-center text-center px-8"
    >
      <span className="font-display text-6xl md:text-7xl text-fg tracking-tight">
        MM
      </span>
      <span className="mt-6 eyebrow">{label}</span>
      <p className="mt-3 text-xs text-fg-faint font-mono uppercase tracking-[0.14em] max-w-[16rem] leading-relaxed">
        {note}
      </p>
    </div>
  );
}
