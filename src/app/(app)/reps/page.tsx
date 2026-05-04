import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";

const TIERS = [
  { name: "Lifter",  range: "0 — 999",        perks: ["Adgang til crew-feed", "Månedlige challenges", "5% medlemsrabat"] },
  { name: "Athlete", range: "1.000 — 4.999",  perks: ["Alt fra Lifter", "Early access til drops", "10% rabat", "1 form-check pr. md."] },
  { name: "Beast",   range: "5.000 — 14.999", perks: ["Alt fra Athlete", "Custom strap-farve (1 stk/år)", "15% rabat", "VIP til IRL-meets"] },
  { name: "Legend",  range: "15.000+",        perks: ["Alt fra Beast", "1:1 tid med Anton", "Limited drops i navnet dit", "20% rabat livstid"] },
];

const HOW = [
  { v: "+50",   k: "Pr. køb i webshoppen",            sub: "Pr. 100 kr brugt" },
  { v: "+100",  k: "Pr. fuldført uge i program",       sub: "Maks 4 uger pr. md." },
  { v: "+250",  k: "Pr. PR du logger med video",       sub: "Verificeret af coach" },
  { v: "+500",  k: "Pr. ven du inviterer ind",         sub: "Når de aktiverer" },
  { v: "+1.000", k: "Pr. challenge du vinder",          sub: "Månedlige" },
  { v: "−",     k: "Reps udløber aldrig",              sub: "De er dine. Punktum." },
];

const REWARDS = [
  { v: "1.200", k: "Limited cuff-farve",       sub: "Olive · kun 80 stk" },
  { v: "2.000", k: "1:1 form-check",            sub: "30 min med Anton" },
  { v: "3.500", k: "Custom-broderet strap",     sub: "Dit handle på din strap" },
  { v: "8.000", k: "Open House VIP-pakke",      sub: "Træning + middag · Amagerbro" },
];

export default function RepsPage() {
  return (
    <>
      <PageHeader
        eyebrow="04 — Reps Program"
        title="Du arbejder. Du får."
        subtitle="Tjen Reps for hvad du allerede gør. Bruge dem på ting du faktisk vil have."
        right={
          <div className="surface-2 rounded-lg px-6 py-4 text-right">
            <div className="eyebrow mb-1">Din balance</div>
            <div className="numeric text-4xl">1.420</div>
            <div className="text-xs text-fg-faint font-mono mt-1">Tier: Legend (i stub)</div>
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
            <span className="numeric text-xs text-fg-dim">Saldo: 1.420 Reps</span>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {REWARDS.map((r) => (
              <article key={r.k} className="surface-2 rounded-lg p-6 lift">
                <div className="numeric text-3xl mb-1">{r.v}</div>
                <div className="eyebrow mb-3">Reps</div>
                <div className="font-display text-lg mb-1">{r.k}</div>
                <p className="text-xs text-fg-dim font-mono">{r.sub}</p>
                <button className="btn btn-sm mt-5 w-full">Indløs</button>
              </article>
            ))}
          </div>
        </section>
      </Container>
    </>
  );
}
