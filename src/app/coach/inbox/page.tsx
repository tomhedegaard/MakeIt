import Link from "next/link";
import { getTranslations } from "next-intl/server";

import Container from "@/components/Container";
import PriorityInboxList from "@/components/coach/PriorityInboxList";
import { getCoachPriorityInbox } from "@/lib/data/coach-priority-inbox";

export async function generateMetadata() {
  const t = await getTranslations("Coach.inbox");
  return { title: t("metaTitle") };
}

export default async function CoachInboxPage() {
  const t = await getTranslations("Coach.inbox");
  const inbox = await getCoachPriorityInbox();

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
          {t("title")}
        </h1>
        <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
          {t("intro")}
        </p>
        {inbox.items.length > 0 ? (
          <p className="mt-3 numeric text-[10px] tracking-[0.16em] uppercase text-fg-faint">
            {t("count", { count: inbox.items.length })}
          </p>
        ) : null}
      </header>

      <section className="surface-2 rounded-2xl overflow-hidden">
        <PriorityInboxList
          items={inbox.items}
          safetyReadable={inbox.safetyReadable}
          mode={inbox.mode}
        />
      </section>

      <Link href="/coach" className="btn btn-sm">
        {t("backToOverview")}
      </Link>
    </Container>
  );
}
