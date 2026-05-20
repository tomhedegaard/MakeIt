import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import {
  getCurrentPlan,
  getOrCreateNutritionProfile,
} from "@/lib/data/nutrition";
import { aggregateShopping } from "@/lib/nutrition/shopping";
import ShoppingChecklist from "./ShoppingChecklist";

export async function generateMetadata() {
  const t = await getTranslations("Nutrition.shopping");
  return { title: t("metaTitle") };
}

export default async function ShoppingPage() {
  const member = (await getSession())!;
  const t = await getTranslations("Nutrition.shopping");
  const [plan, profile] = await Promise.all([
    getCurrentPlan(member.id),
    getOrCreateNutritionProfile(member.id),
  ]);

  if (!plan) {
    return (
      <Container className="py-6 lg:py-12 max-w-2xl space-y-6">
        <Header t={t} />
        <section className="surface-2 rounded-2xl p-6 lg:p-10 text-center">
          <div className="eyebrow mb-3">{t("noPlanEyebrow")}</div>
          <h2 className="font-display text-3xl md:text-4xl leading-[1] mb-3">
            {t("noPlanTitle")}
          </h2>
          <p className="text-fg-dim text-sm md:text-base max-w-md mx-auto mb-5">
            {t("noPlanBody")}
          </p>
          <Link href="/nutrition" className="btn btn-primary">
            {t("noPlanCta")}
          </Link>
        </section>
      </Container>
    );
  }

  const list = aggregateShopping({
    meals: plan.meals,
    householdSize: profile.householdSize,
  });

  const headlineCount = list.groups.reduce(
    (s, g) => s + g.items.length,
    0
  );

  return (
    <Container className="py-6 lg:py-12 max-w-3xl space-y-6">
      <Header t={t} />

      <section className="surface-2 rounded-xl px-5 py-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className="numeric text-3xl">{headlineCount}</span>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
            {t("itemsTotal")}
          </span>
        </div>
        <span aria-hidden className="text-fg-faint">·</span>
        <div className="flex items-baseline gap-2">
          <span className="numeric text-2xl">{plan.meals.length}</span>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
            {t("mealsLabel")}
          </span>
        </div>
        <span aria-hidden className="text-fg-faint">·</span>
        <div className="flex items-baseline gap-2">
          <span className="numeric text-2xl">{list.servings}</span>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
            {list.servings === 1 ? t("personOne") : t("personOther")}
          </span>
        </div>
        <span className="text-[11px] font-mono text-fg-faint ml-auto">
          {t("scaledNote")}
        </span>
      </section>

      <ShoppingChecklist
        planId={plan.id}
        groups={list.groups}
      />

      <section className="text-[11px] font-mono text-fg-faint leading-relaxed">
        {t("footerNote")}
      </section>
    </Container>
  );
}

function Header({
  t,
}: {
  t: Awaited<ReturnType<typeof getTranslations<"Nutrition.shopping">>>;
}) {
  return (
    <header className="pt-2">
      <div className="flex items-center gap-3 mb-3">
        <Link
          href="/nutrition"
          className="text-fg-dim hover:text-fg text-sm"
        >
          {t("back")}
        </Link>
        <span className="text-fg-faint" aria-hidden>·</span>
        <span className="eyebrow">{t("eyebrow")}</span>
      </div>
      <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
        {t("title")}
      </h1>
      <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
        {t("intro")}
      </p>
    </header>
  );
}
