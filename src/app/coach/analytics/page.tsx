import Link from "next/link";
import Container from "@/components/Container";
import { getMemberHealth, type ActivityBucket } from "@/lib/data/coach-analytics";

export const metadata = {
  title: "Coach · Analytics",
};

export default async function CoachAnalyticsPage() {
  const snap = await getMemberHealth();
  const { buckets, atRisk, tiers, signups, onboarding, noProgramCount } = snap;
  const activePct = buckets.total > 0 ? Math.round((buckets.active / buckets.total) * 100) : 0;
  const peakSignups = Math.max(1, ...signups.map((s) => s.count));

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <header className="pt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Coach console · Member health</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,3.5rem)] leading-[0.95]">
            Hvor er crewet?
          </h1>
          <p className="mt-3 text-fg-dim text-sm md:text-base max-w-md">
            Hvem træner. Hvem er på vej væk. Hvem skal have et kald inden weekenden.
          </p>
        </div>
        <Link href="/coach/members" className="btn btn-sm">Alle members →</Link>
      </header>

      {/* Activity buckets */}
      <section
        aria-label="Aktivitet"
        className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line border hairline rounded-lg overflow-hidden"
      >
        <BucketKPI
          label="Aktive · ≤7d"
          value={buckets.active}
          total={buckets.total}
          tone="active"
        />
        <BucketKPI
          label="Sløver · 8–14d"
          value={buckets.slowing}
          total={buckets.total}
          tone="slowing"
        />
        <BucketKPI
          label="At-risk · 15–28d"
          value={buckets.atRisk}
          total={buckets.total}
          tone="atRisk"
        />
        <BucketKPI
          label="Inaktive · 29d+"
          value={buckets.inactive}
          total={buckets.total}
          tone="inactive"
        />
      </section>

      {/* Headline strip — one-line story */}
      <section className="surface-2 rounded-xl px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-2">
          <span className="numeric text-3xl">{activePct}%</span>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
            af crewet trænede sidste uge
          </span>
        </div>
        <span aria-hidden className="text-fg-faint">·</span>
        <div className="flex items-baseline gap-2">
          <span className="numeric text-2xl">{noProgramCount}</span>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
            uden aktivt program
          </span>
        </div>
        <span aria-hidden className="text-fg-faint">·</span>
        <div className="flex items-baseline gap-2">
          <span className="numeric text-2xl">{onboarding.pct}%</span>
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim">
            har gennemført onboarding
          </span>
        </div>
      </section>

      {/* Two columns: at-risk list + tier distribution */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* At-risk list */}
        <section className="md:col-span-2 surface-2 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b hairline flex items-center justify-between">
            <div>
              <div className="eyebrow mb-1">Skal kontaktes</div>
              <h2 className="font-display text-2xl">At-risk</h2>
            </div>
            <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5">
              {atRisk.length}
            </span>
          </div>
          {atRisk.length === 0 ? (
            <div className="p-6 text-sm text-fg-dim text-center">
              Ingen er på vej væk. Crewet trækker.
            </div>
          ) : (
            <ul className="divide-y hairline">
              {atRisk.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/coach/members/${m.id}`}
                    className="block px-5 py-3 flex items-center gap-4 hover:bg-bg-3"
                  >
                    <BucketDot bucket={m.bucket} />
                    <div className="size-9 rounded-full bg-bg-elev border hairline-strong flex items-center justify-center text-[10px] font-mono shrink-0">
                      {m.handle.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">@{m.handle}</div>
                      <div className="text-[11px] font-mono text-fg-faint">
                        {m.tier} · {m.programCode ?? "Intet program"}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="numeric text-sm">
                        {m.daysSinceLastSession === null ? "—" : `${m.daysSinceLastSession}d`}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                        {m.daysSinceLastSession === null ? "Aldrig trænet" : "siden"}
                      </div>
                    </div>
                    <span className="text-fg-dim ml-2" aria-hidden>→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Tier distribution */}
        <aside className="surface-2 rounded-2xl p-5 lg:p-6 space-y-4">
          <div>
            <div className="eyebrow mb-1">Fordeling</div>
            <h2 className="font-display text-2xl">Tiers</h2>
          </div>
          <ul className="space-y-3">
            {tiers.map((t) => (
              <li key={t.tier}>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-sm">{t.tier}</span>
                  <span className="numeric text-xs text-fg-dim">
                    {t.count} · {t.pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-fg"
                    style={{ width: `${Math.max(2, t.pct)}%` }}
                    aria-hidden
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="pt-3 border-t hairline">
            <div className="text-[11px] font-mono text-fg-faint uppercase tracking-[0.14em]">
              Tier-tærskler
            </div>
            <div className="text-[11px] font-mono text-fg-dim mt-1.5 leading-relaxed">
              Lifter 0+ · Athlete 1.000 · Beast 5.000 · Legend 15.000 Reps
            </div>
          </div>
        </aside>
      </div>

      {/* Signup trend */}
      <section className="surface-2 rounded-2xl p-5 lg:p-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="eyebrow mb-1">Tilgang</div>
            <h2 className="font-display text-2xl">Nye medlemmer · 8 uger</h2>
          </div>
          <div className="text-right">
            <div className="numeric text-3xl">
              {signups.reduce((sum, s) => sum + s.count, 0)}
            </div>
            <div className="eyebrow">i alt</div>
          </div>
        </div>

        <ol
          aria-label="Tilgang pr. uge"
          className="grid grid-cols-8 gap-1.5 items-end h-32"
        >
          {signups.map((w) => {
            const heightPct = Math.round((w.count / peakSignups) * 100);
            return (
              <li key={w.weekIso} className="flex flex-col items-center justify-end h-full">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-fg/80 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(2, heightPct)}%` }}
                    aria-hidden
                  />
                </div>
                <div className="numeric text-[11px] mt-1.5">{w.count}</div>
                <div className="text-[9px] font-mono text-fg-faint uppercase tracking-[0.14em]">
                  {w.weekLabel}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </Container>
  );
}

/* ---------------------------------------------------------------- *
 * Sub-components
 * ---------------------------------------------------------------- */

function BucketKPI({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: ActivityBucket;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="bg-bg p-5 lg:p-6">
      <div className="eyebrow mb-2 flex items-center gap-2">
        <BucketDot bucket={tone} />
        {label}
      </div>
      <div className="numeric text-3xl lg:text-4xl">{value}</div>
      <div className="text-[11px] font-mono text-fg-faint mt-1">{pct}%</div>
    </div>
  );
}

function BucketDot({ bucket }: { bucket: ActivityBucket }) {
  // Use opacity steps off the brand fg color so the palette stays
  // monochromatic. Active = full fg; inactive = ghosted; in between
  // ramps down. Pulse only on the riskiest two so the eye finds them.
  const map: Record<ActivityBucket, { className: string; pulse: boolean }> = {
    active:   { className: "size-2 rounded-full bg-fg",            pulse: false },
    slowing:  { className: "size-2 rounded-full bg-fg/55",         pulse: false },
    atRisk:   { className: "size-2 rounded-full bg-fg/85",         pulse: true  },
    inactive: { className: "size-2 rounded-full border hairline-strong", pulse: false },
  };
  const { className, pulse } = map[bucket];
  if (pulse) {
    return <span className="pulse-dot" aria-hidden />;
  }
  return <span className={className} aria-hidden />;
}
