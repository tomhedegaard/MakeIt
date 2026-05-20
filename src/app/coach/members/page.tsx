import Link from "next/link";
import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { getMembersSummary } from "@/lib/data/coach";

export default async function CoachMembersPage() {
  const t = await getTranslations("Coach.members");
  const members = await getMembersSummary();

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2">
        <div className="eyebrow mb-2">{t("eyebrow")}</div>
        <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">{t("title")}</h1>
        <p className="mt-2 text-fg-dim text-sm">{t("count", { count: members.length })}</p>
      </header>

      <section className="surface-2 rounded-2xl overflow-hidden">
        {members.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="font-display text-2xl mb-2">{t("emptyTitle")}</div>
            <p className="text-fg-dim text-sm max-w-sm mx-auto">
              {t("emptyBody")}
            </p>
          </div>
        ) : (
          <ul className="divide-y hairline">
            {members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/coach/members/${m.id}`}
                  className="block px-5 py-4 flex items-center gap-4 hover:bg-bg-3"
                >
                  <div className="size-10 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-xs font-mono shrink-0">
                    {m.handle.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">@{m.handle}</div>
                    <div className="text-[11px] font-mono text-fg-faint">
                      {m.tier} ·{" "}
                      {m.programCode
                        ? t("withProgram", { programCode: m.programCode, programWeek: m.programWeek ?? "" })
                        : t("noProgram")}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                      {t("last")}
                    </div>
                    <div className="numeric text-sm">
                      {m.lastSessionDate ?? "—"}
                    </div>
                  </div>
                  <span className="text-fg-dim ml-2" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
