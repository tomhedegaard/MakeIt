import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getPendingRedemptions } from "@/lib/data/coach";
import RedemptionRow from "@/components/coach/RedemptionRow";

export default async function CoachRedemptionsPage() {
  const t = await getTranslations("Coach.redemptions");
  const items = await getPendingRedemptions(50);

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-title">
          {t("title")}
        </h1>
        <p className="mt-2 text-fg-dim text-meta">
          {t("waiting", { count: items.length })}
        </p>
      </header>

      {items.length === 0 ? (
        <div className="surface-2 rounded-2xl p-8">
          <div className="font-display text-section mb-2">{t("emptyTitle")}</div>
          <p className="text-fg-dim text-meta">
            {t("emptyBody")}
          </p>
        </div>
      ) : (
        <ul className="surface-2 rounded-2xl divide-y hairline overflow-hidden">
          {items.map((r) => (
            <RedemptionRow key={r.id} redemption={r} />
          ))}
        </ul>
      )}

      <p className="text-micro text-fg-faint">
        {t("statusFlow")}
      </p>
    </Container>
  );
}
