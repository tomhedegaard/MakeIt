import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import {
  getCoachOverview,
  getMembersSummary,
  getPendingFormChecks,
} from "@/lib/data/coach";
import SendDigestButton from "@/components/coach/SendDigestButton";

export default async function CoachOverviewPage() {
  const t = await getTranslations("Coach.overview");
  const [overview, members, pending] = await Promise.all([
    getCoachOverview(),
    getMembersSummary(),
    getPendingFormChecks(5),
  ]);

  // Recent activity = most recent member sessions (mock-ish ordering by lastSessionDate)
  const recentlyActive = members
    .filter((m) => m.lastSessionDate)
    .sort((a, b) => (a.lastSessionDate! < b.lastSessionDate! ? 1 : -1))
    .slice(0, 6);

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{t("eyebrow")}</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
            {t("title")}
          </h1>
          <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
            {t("intro")}
          </p>
        </div>
        <SendDigestButton />
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-px bg-line border hairline rounded-lg overflow-hidden">
        <KPI label={t("kpiMembers")}           value={overview.totalMembers} />
        <KPI label={t("kpiActivePrograms")}    value={overview.activeAssignments} />
        <KPI label={t("kpiPendingFormChecks")} value={overview.pendingFormChecks} pulse={overview.pendingFormChecks > 0} />
        <KPI label={t("kpiRedemptions")}       value={overview.pendingRedemptions} pulse={overview.pendingRedemptions > 0} />
        <KPI label={t("kpiSessionsPerWeek")}   value={overview.sessionsThisWeek} />
      </section>

      {/* Two column */}
      <div className="grid gap-6 md:grid-cols-3">
        <section className="md:col-span-2 surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b hairline flex items-center justify-between">
            <div>
              <div className="eyebrow mb-1">{t("recentEyebrow")}</div>
              <h2 className="font-display text-2xl">{t("recentTitle")}</h2>
            </div>
            <Link href="/coach/members" className="btn btn-sm">{t("allMembers")}</Link>
          </div>

          {recentlyActive.length === 0 ? (
            <div className="p-6 text-sm text-fg-dim text-center">
              {t("recentEmpty")}
            </div>
          ) : (
            <ul className="divide-y hairline">
              {recentlyActive.map((m) => (
                <li key={m.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                    {m.handle.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">@{m.handle}</div>
                    <div className="text-[11px] font-mono text-fg-faint">
                      {m.programCode
                        ? t("memberWithProgram", { programCode: m.programCode, programWeek: m.programWeek ?? "" })
                        : t("memberNoProgram")}
                    </div>
                  </div>
                  <span className="numeric text-xs text-fg-dim shrink-0">{m.lastSessionDate}</span>
                  <Link
                    href={`/coach/members/${m.id}`}
                    className="text-fg-dim hover:text-fg"
                    aria-label={t("openMember", { handle: m.handle })}
                  >
                    →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b hairline flex items-center justify-between">
            <div>
              <div className="eyebrow mb-1">{t("queueEyebrow")}</div>
              <h2 className="font-display text-2xl">{t("queueTitle")}</h2>
            </div>
            {pending.length > 0 ? (
              <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
                {pending.length}
              </span>
            ) : null}
          </div>
          {pending.length === 0 ? (
            <div className="p-5 text-sm text-fg-dim">{t("queueEmpty")}</div>
          ) : (
            <ul className="divide-y hairline">
              {pending.slice(0, 4).map((f) => (
                <li key={f.id} className="px-5 py-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span>@{f.memberHandle}</span>
                    <span className="numeric text-fg-faint text-xs">
                      {f.aiScore != null ? `${f.aiScore}/100` : ""}
                    </span>
                  </div>
                  <div className="text-fg-dim text-xs truncate">
                    {f.exerciseName ?? t("formCheckFallback")}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t hairline p-3">
            <Link href="/coach/queue" className="btn btn-sm w-full">
              {t("openQueue")}
            </Link>
          </div>
        </aside>
      </div>
    </Container>
  );
}

function KPI({ label, value, pulse }: { label: string; value: number | string; pulse?: boolean }) {
  return (
    <div className="bg-bg p-5 lg:p-6">
      <div className="eyebrow mb-2 flex items-center gap-2">
        {pulse ? <span className="pulse-dot" /> : null}
        {label}
      </div>
      <div className="numeric text-3xl lg:text-4xl">{value}</div>
    </div>
  );
}
