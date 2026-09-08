"use client";

import { useTranslations } from "next-intl";
import Container from "@/components/Container";

/**
 * Immediate paint while /nutrition or /mind resolve first-visit data.
 * Client-side so the fallback does not wait on a server translation fetch.
 */
export default function RouteOpening({
  kind,
}: {
  kind: "nutrition" | "mind";
}) {
  const t = useTranslations("Misc.loading");
  const title = kind === "nutrition" ? t("nutritionTitle") : t("mindTitle");
  const body = kind === "nutrition" ? t("nutritionBody") : t("mindBody");

  return (
    <Container className="py-12 lg:py-16">
      <div className="eyebrow mb-3">{t("redirectEyebrow")}</div>
      <h1 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-[0.95] mb-4">
        {title}
      </h1>
      <p className="text-fg-dim text-base max-w-md leading-relaxed mb-8">
        {body}
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
