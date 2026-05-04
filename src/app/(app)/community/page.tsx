import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";

const FEED = [
  { who: "@nina_dl",   tier: "Beast",   what: "Ny DL PR — 175 kg @ 68 kg BW. Brugte sorte StrapIts, hænderne overlevede.", when: "2m",   pr: true },
  { who: "@kasper_s",  tier: "Athlete", what: "Afsluttet uge 8 af PR-Block. Squat top single 162.5 kg, sad let.",         when: "1t",   pr: false },
  { who: "@maria.lift", tier: "Beast",  what: "Form-check video uploadet — bench-pause med 90 kg. Tager gerne kommentarer.", when: "3t",  pr: false },
  { who: "@anton",     tier: "Legend",  what: "Limited cuff-farve drops på fredag — kun for crewet. Olive er tilbage.",   when: "5t",   pr: false },
  { who: "@frederik",  tier: "Lifter",  what: "Første dag på Build Phase. 4 sæt squat. Allerede pumped.",                   when: "8t",  pr: false },
];

const LEADERBOARD = [
  { rank: "01", who: "@nina_dl",    score: "412.5", lift: "Total · kg" },
  { rank: "02", who: "@kasper_s",   score: "405.0", lift: "Total · kg" },
  { rank: "03", who: "@maria.lift", score: "382.5", lift: "Total · kg" },
  { rank: "04", who: "@anton",      score: "377.5", lift: "Total · kg" },
  { rank: "05", who: "@frederik",   score: "340.0", lift: "Total · kg" },
];

export default function CommunityPage() {
  return (
    <>
      <PageHeader
        eyebrow="03 — Community"
        title="Crewets feed."
        subtitle="Ingen ads. Ingen algoritmer. Bare folk der løfter, og opdateringer der betyder noget."
        right={
          <div className="flex gap-3">
            <button className="btn btn-primary">Del en PR</button>
            <button className="btn">Upload form-check</button>
          </div>
        }
      />

      <Container className="py-12 grid gap-10 md:grid-cols-3">
        <section className="md:col-span-2 space-y-3">
          <div className="eyebrow mb-2">Live feed</div>
          <ul className="space-y-3">
            {FEED.map((f, i) => (
              <li key={i} className="surface-2 rounded-lg p-5 lift">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-xs font-mono">
                      {f.who.slice(1, 3).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm">{f.who}</div>
                      <div className="eyebrow text-[10px]">{f.tier}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {f.pr ? (
                      <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2.5 py-1">
                        ★ PR
                      </span>
                    ) : null}
                    <span className="numeric text-xs text-fg-faint">{f.when}</span>
                  </div>
                </div>
                <p className="text-fg/90 text-base leading-relaxed">{f.what}</p>
                <div className="mt-3 pt-3 border-t hairline flex items-center gap-4 text-xs font-mono text-fg-dim">
                  <button className="hover:text-fg">+ Reps</button>
                  <button className="hover:text-fg">Kommentér</button>
                  <button className="hover:text-fg">Del</button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-6">
          <div className="surface-2 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b hairline">
              <div className="eyebrow mb-1">Maj challenge</div>
              <div className="font-display text-xl">100K Volumen Club</div>
            </div>
            <div className="p-5">
              <div className="numeric text-4xl mb-1">68 / 100</div>
              <div className="text-xs text-fg-faint font-mono mb-4">k volume så langt · 11 dage tilbage</div>
              <div className="h-1.5 bg-bg-elev rounded-full overflow-hidden">
                <div className="h-full bg-fg" style={{ width: "68%" }} />
              </div>
              <button className="btn btn-sm w-full mt-5">Tilmeld dig</button>
            </div>
          </div>

          <div className="surface-2 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b hairline flex items-center justify-between">
              <div>
                <div className="eyebrow mb-1">Leaderboard</div>
                <div className="font-display text-xl">Top atleter</div>
              </div>
              <span className="eyebrow">Maj 2026</span>
            </div>
            <ul className="divide-y hairline">
              {LEADERBOARD.map((row) => (
                <li key={row.rank} className="px-5 py-3 flex items-center gap-4 text-sm">
                  <span className="numeric text-fg-faint w-8">{row.rank}</span>
                  <span className="flex-1">{row.who}</span>
                  <span className="numeric">{row.score}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="surface-2 rounded-lg p-5">
            <div className="eyebrow mb-2">Næste IRL-meet</div>
            <div className="font-display text-xl mb-1">Open House — Amagerbro</div>
            <p className="text-sm text-fg-dim">
              Lørdag 24/05 · Engvej 169 · Træning, kaffe, og en sneak peek af nye produkter.
            </p>
            <button className="btn btn-sm mt-4">RSVP</button>
          </div>
        </aside>
      </Container>
    </>
  );
}
