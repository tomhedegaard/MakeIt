import { redirect } from "next/navigation";
import Container from "@/components/Container";
import { getSession } from "@/lib/auth";
import { getAllCirklerForAdmin } from "@/lib/data/mind";
import CreateCirkelForm from "./CreateCirkelForm";

export const metadata = {
  title: "Cirkler · Coach · MakeIt",
};

/**
 * `/coach/cirkler` — Munk-only admin for mental cirkler (Søjle 5 MH-10).
 *
 * Lists all cirkler with leader + member count. Form to create new
 * cirkler. Member-add flow is currently SQL-driven; UI for adding
 * specific members lands in a fast-follow if it gets used.
 */
export default async function CoachCirklerPage() {
  const member = await getSession();
  if (!member) redirect("/login");
  if (!member.isAdmin) redirect("/coach");

  const cirkler = await getAllCirklerForAdmin();

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Coach · Søjle 5</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
            Cirkler.
          </h1>
          <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
            Asynkron 3-6 medlemmers grupper. Beast+ medlemmer kan være
            med. Legend leder cirklen. Du opretter + parrer.
          </p>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <CreateCirkelForm />
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="font-display text-xl">Aktive cirkler</h2>
          {cirkler.length === 0 ? (
            <p className="text-fg-dim text-sm leading-relaxed">
              Ingen cirkler endnu. Opret den første til venstre — Beast-tier
              medlemmer kan derefter joines via SQL eller fast-follow UI.
            </p>
          ) : (
            <div className="rounded-2xl border hairline bg-bg-2/30 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-bg-2/60 text-fg-dim text-xs uppercase tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Navn</th>
                    <th className="text-left px-4 py-3">Leder</th>
                    <th className="text-right px-4 py-3 tabular-nums">Medlemmer</th>
                    <th className="text-left px-4 py-3">Oprettet</th>
                  </tr>
                </thead>
                <tbody>
                  {cirkler.map((c) => (
                    <tr key={c.id} className="border-t hairline">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-fg-dim">
                        {c.leader_handle ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {c.member_count} / {c.max_members}
                      </td>
                      <td className="px-4 py-3 text-fg-dim text-xs tabular-nums">
                        {c.created_at.slice(0, 10)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="text-fg-dim text-xs leading-relaxed">
            Cirkel-poster + reactions surfacer i medlemmernes
            <code className="px-1 mx-1 rounded bg-bg-2 text-fg">/mind/cirkler</code>.
            Du har ikke direct moderation-værktøjer i v0 — eskaler via
            normal coach queue hvis noget kræver indgriben.
          </p>
        </div>
      </div>
    </Container>
  );
}
