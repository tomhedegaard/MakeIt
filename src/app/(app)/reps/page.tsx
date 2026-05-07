import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import { getSession } from "@/lib/auth";
import {
  getRewardCatalog,
  getMyRedemptions,
  getRepsBalance,
  statusLabel,
} from "@/lib/data/rewards";
import RedeemButton from "./RedeemButton";

const TIERS = [
  { name: "Lifter",  range: "0 — 999",        perks: ["Adgang til crew-feed", "Månedlige challenges", "5% medlemsrabat"] },
  { name: "Athlete", range: "1.000 — 4.999",  perks: ["Alt fra Lifter", "Early access til drops", "10% rabat", "1 form-check pr. md."] },
  { name: "Beast",   range: "5.000 — 14.999", perks: ["Alt fra Athlete", "Custom strap-farve (1 stk/år)", "15% rabat", "VIP til IRL-meets"] },
  { name: "Legend",  range: "15.000+",        perks: ["Alt fra Beast", "1:1 tid med Mikael Munk", "Limited drops i navnet dit", "20% rabat livstid"] },
];

const HOW = [
  { v: "+50",   k: "Pr. køb i webshoppen",            sub: "Pr. 100 kr brugt" },
  { v: "+100",  k: "Pr. fuldført uge i program",       sub: "Maks 4 uger pr. md." },
  { v: "+250",  k: "Pr. PR du logger med video",       sub: "Verificeret af coach" },
  { v: "+500",  k: "Pr. ven du inviterer ind",         sub: "Når de aktiverer" },
  { v: "+1.000", k: "Pr. challenge du vinder",          sub: "Månedlige" },
  { v: "−",     k: "Reps udløber aldrig",              sub: "De er dine. Punktum." },
];

const KIND_LABELS: Record<string, string> = {
  drop: "Limited drop",
  experience: "Experience",
  physical: "Fysisk vare",
  digital: "Digital",
};

export default async function RepsPage() {
  const member = (await getSession())!;

  const [rewards, redemptions, balance] = await Promise.all([
    getRewardCatalog(),
    getMyRedemptions(member.id, 10),
    getRepsBalance(member.id),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="04 — Reps Program"
        title="Du arbejder. Du får."
        subtitle="Tjen Reps for hvad du allerede gør. Bruge dem på ting du faktisk vil have."
        right={
          <div className="surface-2 rounded-lg px-6 py-4 text-right">
            <div className="eyebrow mb-1">Din balance</div>
            <div className="numeric text-4xl">
              {balance.toLocaleString("da-DK")}
            </div>
            <div className="text-xs text-fg-faint font-mono mt-1">
              Tier: {member.tier}
            </div>
          </div>
        }
      />

      <Container className="py-12 space-y-14">
        <section>
          <div className="eyebrow mb-6">Tiers</div>
          <div className="grid gap-px bg-line border hairline md:grid-cols-4">
            {TIERS.map((t) => (
              <div key={t.name} className="bg-bg p-6">
                <div className="font-display text-2xl mb-1">{t.name}</div>
                <div className="numeric text-xs text-fg-dim mb-4">{t.range} Reps</div>
                <ul className="space-y-2 text-sm text-fg/85">
                  {t.perks.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span className="text-fg-faint">·</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="eyebrow mb-6">Sådan tjener du</div>
          <div className="grid gap-px bg-line border hairline md:grid-cols-3">
            {HOW.map((row) => (
              <div key={row.k} className="bg-bg p-6">
                <div className="numeric text-3xl text-fg mb-2">{row.v}</div>
                <div className="text-fg/90 text-sm">{row.k}</div>
                <div className="text-xs text-fg-faint font-mono mt-1">{row.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-end justify-between mb-6">
            <div className="eyebrow">Reward shop</div>
            <span className="numeric text-xs text-fg-dim">
              Saldo: {balance.toLocaleString("da-DK")} Reps
            </span>
          </div>
          {rewards.length === 0 ? (
            <div className="surface-2 rounded-lg p-6 text-sm text-fg-dim">
              Ingen aktive belønninger lige nu. Mikael lægger nye drops ind løbende.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {rewards.map((r) => (
                <article key={r.id} className="surface-2 rounded-lg p-6 lift flex flex-col">
                  <div className="numeric text-3xl mb-1">
                    {r.costReps.toLocaleString("da-DK")}
                  </div>
                  <div className="eyebrow mb-3">Reps</div>
                  <div className="font-display text-lg mb-1">{r.name}</div>
                  {r.description ? (
                    <p className="text-xs text-fg-dim font-mono mb-3 flex-1">
                      {r.description}
                    </p>
                  ) : <div className="flex-1" />}
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                    <span>{KIND_LABELS[r.kind] ?? r.kind}</span>
                    {r.stock !== null ? (
                      <span>{r.stock} tilbage</span>
                    ) : (
                      <span>Ubegrænset</span>
                    )}
                  </div>
                  <RedeemButton reward={r} balance={balance} />
                </article>
              ))}
            </div>
          )}
        </section>

        {redemptions.length > 0 ? (
          <section>
            <div className="flex items-end justify-between mb-3">
              <div className="eyebrow">Mine indløsninger</div>
              <span className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">
                {redemptions.length} samlet
              </span>
            </div>
            <ul className="surface-2 rounded-lg divide-y hairline overflow-hidden">
              {redemptions.map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                  <span className="numeric text-xs text-fg-faint w-20 shrink-0">
                    {new Date(r.redeemedAt).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="flex-1 truncate">{r.rewardName}</span>
                  <span className="numeric text-fg-dim text-xs shrink-0">
                    − {r.costReps.toLocaleString("da-DK")}
                  </span>
                  <span
                    className="text-[10px] font-mono uppercase tracking-[0.14em] border hairline-strong rounded-full px-2 py-0.5 shrink-0"
                    style={{
                      color:
                        r.status === "fulfilled" || r.status === "shipped"
                          ? "var(--fg)"
                          : r.status === "cancelled"
                            ? "var(--fg-faint)"
                            : "var(--fg-dim)",
                    }}
                  >
                    {statusLabel(r.status)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}
