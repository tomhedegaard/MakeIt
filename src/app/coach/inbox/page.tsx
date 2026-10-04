import { getTranslations } from "next-intl/server";

import Container from "@/components/Container";
import InboxCasePanel from "@/components/coach/InboxCasePanel";
import PriorityInboxList from "@/components/coach/PriorityInboxList";
import PageTitle from "@/components/ui/PageTitle";
import { getSession } from "@/lib/auth";
import { getCoachPriorityInbox } from "@/lib/data/coach-priority-inbox";

export async function generateMetadata() {
  const t = await getTranslations("Coach.inbox");
  return { title: t("metaTitle") };
}

export default async function CoachInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ case?: string }>;
}) {
  const t = await getTranslations("Coach.inbox");
  const [inbox, sp, member] = await Promise.all([
    getCoachPriorityInbox(),
    searchParams,
    getSession(),
  ]);

  // Split view (spec §6.8): ?case= picks the panel's case. Without one —
  // or once that case is closed — the top of the queue is open, so the
  // panel is never blank on a wide screen.
  const selected =
    inbox.items.find((i) => i.id === sp.case) ?? inbox.items[0] ?? null;
  const coachName = member?.displayName || member?.handle || "";

  return (
    <Container size="wide" className="py-6 lg:py-12 space-y-8">
      <header className="pt-2">
        <PageTitle kicker={t("eyebrow")} title={t("title")} />
        <p className="mt-3 text-fg-dim text-meta md:text-copy max-w-md">
          {t("intro")}
        </p>
        {inbox.items.length > 0 ? (
          <p className="mt-3 numeric text-meta text-fg-faint">
            {t("count", { count: inbox.items.length })}
          </p>
        ) : null}
      </header>

      <div className="surface-2 lg:grid lg:grid-cols-[400px_minmax(0,1fr)]">
        <section aria-label={t("listLabel")} className="lg:border-r hairline">
          <PriorityInboxList
            items={inbox.items}
            safetyReadable={inbox.safetyReadable}
            mode={inbox.mode}
            selectedId={selected?.id}
          />
        </section>
        <section
          aria-label={t("panelLabel")}
          className="hidden lg:block p-8 min-w-0"
        >
          {selected ? (
            <InboxCasePanel item={selected} coachName={coachName} />
          ) : (
            <p className="text-meta text-fg-dim">{t("selectCase")}</p>
          )}
        </section>
      </div>
    </Container>
  );
}
