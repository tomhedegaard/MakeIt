import Container from "@/components/Container";
import { getTranslations } from "next-intl/server";

export default async function MindLoading() {
  const t = await getTranslations("Misc.loading");
  return (
    <Container className="py-12 lg:py-16">
      <div className="eyebrow mb-3">{t("redirectEyebrow")}</div>
      <h1 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-[0.95] mb-4">
        {t("mindTitle")}
      </h1>
      <p className="text-fg-dim text-base max-w-md leading-relaxed mb-8">
        {t("mindBody")}
      </p>
      <div className="flex gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2.5 rounded-full bg-fg animate-pulse"
            style={{ animationDelay: `${i * 220}ms` }}
          />
        ))}
      </div>
    </Container>
  );
}
