import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/app/PageHeader";
import Sparkline from "@/components/ui/Sparkline";
import { getSession } from "@/lib/auth";
import { getMyFormChecks } from "@/lib/data/me";
import { getMyLifts, type LiftPr, type LiftStats } from "@/lib/data/lifts";

export default async function ProfilePage() {
  const m = (await getSession())!;
  const [formChecks, lifts] = await Promise.all([
    getMyFormChecks(m.id, 8),
    getMyLifts(m.id),
  ]);
  const reviewed = formChecks.filter((f) => f.reviewedAt);
  const pending = formChecks.filter((f) => !f.reviewedAt);
  const recentPRs = collectRecentPRs(lifts);

  return (
    <>
      <PageHeader
        eyebrow="05 — Profil"
        title={`@${m.handle}`}
        subtitle={`Tier: ${m.tier} · Medlem siden ${new Date(m.joinedAt).toLocaleDateString("da-DK")}`}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/settings" className="btn btn-sm">
              Indstillinger
            </Link>
            {m.isCoach ? (
              <Link href="/coach" className="btn btn-primary btn-sm">
                Åbn coach-konsol →
              </Link>
            ) : null}
          </div>
        }
      />

      <Container className="py-12 space-y-8">
        {/* Lifts — sparkline cards */}
        <section aria-label="Lifts">
          <div className="eyebrow mb-3">Lifts på record</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {lifts.map((l) => (
              <article
                key={l.key}
                className="surface-2 rounded-2xl p-5 lift"
              >
                <div className="flex items-end justify-between mb-1">
                  <div className="eyebrow">{l.label}</div>
                  {l.delta4w != null ? (
                    <span
                      className="text-[10px] font-mono uppercase tracking-[0.14em]"
                      style={{
                        color: l.delta4w > 0 ? "var(--fg)" : "var(--fg-faint)",
                      }}
                    >
                      {l.delta4w > 0 ? "+" : ""}
                      {l.delta4w} kg / 4u
                    </span>
                  ) : null}
                </div>
                <div className="flex items-baseline gap-1.5 mb-3">
                  <span className="numeric text-4xl">
                    {l.currentE1rm != null ? l.currentE1rm : "—"}
                  </span>
                  <span className="text-fg-dim text-xs">kg e1RM</span>
                </div>
                <div className="text-fg/70">
                  <Sparkline data={l.history.map((h) => h.e1rm)} />
                </div>
                <div className="mt-3 text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">
                  {l.history.length > 0
                    ? `${l.history.length} ${l.history.length === 1 ? "uge" : "uger"} data`
                    : "Log et sæt for at starte"}
                </div>
              </article>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">
            e1RM beregnet med Epley · weight × (1 + reps / 30) · top reps ≤ 10
          </p>
        </section>

        {/* Recent PRs */}
        {recentPRs.length > 0 ? (
          <section aria-label="Seneste PRs">
            <div className="flex items-end justify-between mb-3">
              <div className="eyebrow">Seneste PR&apos;er</div>
              <span className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em]">
                Detekteret automatisk
              </span>
            </div>
            <ul className="surface-2 rounded-2xl divide-y hairline overflow-hidden">
              {recentPRs.map((pr, i) => (
                <li
                  key={`${pr.date}-${pr.exerciseName}-${i}`}
                  className="px-5 py-3 flex items-center gap-4 text-sm"
                >
                  <span className="numeric text-xs text-fg-faint w-20 shrink-0">
                    {new Date(pr.date).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="flex-1 truncate">{pr.exerciseName}</span>
                  <span className="numeric text-fg-dim text-xs shrink-0">
                    {pr.weight} × {pr.reps}
                  </span>
                  <span className="numeric shrink-0">
                    {pr.e1rm}
                    <span className="text-fg-dim text-xs ml-1">e1RM</span>
                  </span>
                  <span
                    className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 shrink-0"
                    aria-hidden
                  >
                    ★
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Settings + Billing */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="surface-2 rounded-lg p-8">
            <div className="eyebrow mb-4">Indstillinger</div>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between border-b hairline pb-3">
                <span className="text-fg-dim">Email</span>
                <span>{m.email ?? `${m.handle}@nowmakeit.eu`}</span>
              </li>
              <li className="flex items-center justify-between border-b hairline pb-3">
                <span className="text-fg-dim">Notifikationer</span>
                <span>Crew + PR&apos;er</span>
              </li>
              <li className="flex items-center justify-between border-b hairline pb-3">
                <span className="text-fg-dim">Sprog</span>
                <span>Dansk</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-fg-dim">Tema</span>
                <span>Mørk (kun)</span>
              </li>
            </ul>
          </section>

          <section className="surface-2 rounded-lg p-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="eyebrow mb-2">Billing</div>
                <div className="font-display text-xl">Abonnement &amp; betaling</div>
                <p className="text-sm text-fg-dim mt-1 max-w-md">
                  Administrér dit Crew-medlemskab og 1:1 add-on. Sikker checkout via Stripe.
                </p>
              </div>
              <Link href="/billing" className="btn btn-sm btn-primary">
                Åbn billing →
              </Link>
            </div>
          </section>
        </div>

        {/* Form-checks */}
        <section
          id="form-checks"
          className="surface-2 rounded-lg p-6 md:p-8"
          aria-label="Mine form-checks"
        >
          <div className="flex items-end justify-between gap-4 mb-5">
            <div>
              <div className="eyebrow mb-2">Form-checks</div>
              <div className="font-display text-xl">
                {formChecks.length === 0
                  ? "Ingen form-checks endnu"
                  : "Dine seneste optagelser"}
              </div>
              <p className="text-sm text-fg-dim mt-1 max-w-md">
                AI-vurdering først, derefter en personlig note fra Mikael Munk
                inden for 24 timer.
              </p>
            </div>
            {reviewed.length > 0 ? (
              <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-1 inline-flex items-center gap-2 shrink-0">
                <span className="size-1.5 rounded-full bg-fg" />
                {reviewed.length} {reviewed.length === 1 ? "svar" : "svar"} fra coach
              </span>
            ) : null}
          </div>

          {formChecks.length === 0 ? (
            <p className="text-sm text-fg-dim">
              Tap &ldquo;Form-check med AI&rdquo; i en aktiv session eller via
              + Del i Crew for at få din første vurdering.
            </p>
          ) : (
            <ul className="space-y-4">
              {formChecks.map((f) => (
                <li key={f.id} className="surface rounded-xl overflow-hidden">
                  <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="eyebrow mb-1">
                        {f.exerciseName ?? "Form-check"}
                      </div>
                      <h3 className="font-display text-lg leading-snug">
                        {f.aiHeadline ?? "AI-svar"}
                      </h3>
                      <div className="mt-1 text-[11px] font-mono text-fg-faint">
                        {new Date(f.createdAt).toLocaleString("da-DK", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="numeric text-3xl">{f.aiScore ?? "—"}</div>
                      <div className="eyebrow">/ 100</div>
                    </div>
                  </header>

                  {f.videoUrl ? (
                    <div className="border-t hairline">
                      <video
                        src={f.videoUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full max-h-[340px] object-contain bg-black"
                      />
                    </div>
                  ) : null}

                  {f.aiPos.length > 0 || f.aiNeg.length > 0 || f.aiFix ? (
                    <div className="px-5 py-4 border-t hairline grid gap-3 sm:grid-cols-2">
                      {f.aiPos.length > 0 ? (
                        <div>
                          <div className="eyebrow mb-1.5">Godt</div>
                          <ul className="space-y-1 text-sm text-fg/90">
                            {f.aiPos.map((p) => (
                              <li key={p} className="flex gap-2">
                                <span className="text-fg-faint">·</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {f.aiNeg.length > 0 ? (
                        <div>
                          <div className="eyebrow mb-1.5">Stram op</div>
                          <ul className="space-y-1 text-sm text-fg/90">
                            {f.aiNeg.map((n) => (
                              <li key={n} className="flex gap-2">
                                <span className="text-fg-faint">·</span>
                                <span>{n}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {f.aiFix ? (
                        <div className="sm:col-span-2 rounded-lg surface-2 p-3">
                          <div className="eyebrow mb-1.5">Coach-tip</div>
                          <p className="text-sm text-fg/90">{f.aiFix}</p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {f.reviewedAt && f.coachNotes ? (
                    <div
                      className="px-5 py-4 border-t hairline-strong"
                      style={{ background: "var(--bg-3)" }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="numeric text-[10px] tracking-[0.16em] uppercase border hairline-strong rounded-full px-2 py-0.5 inline-flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-fg" />
                          Mikael Munk · @Munk
                        </span>
                        <span className="numeric text-[10px] text-fg-faint">
                          {new Date(f.reviewedAt).toLocaleString("da-DK", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-fg leading-relaxed whitespace-pre-wrap">
                        {f.coachNotes}
                      </p>
                    </div>
                  ) : (
                    <div className="px-5 py-3 border-t hairline">
                      <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                        Afventer coach-review · typisk inden for 24 timer
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-5">
            {pending.length > 0
              ? `${pending.length} afventer review · ${reviewed.length} besvaret`
              : reviewed.length > 0
                ? `Alle ${reviewed.length} besvaret`
                : ""}
          </p>
        </section>
      </Container>
    </>
  );
}

/** Top-N most recent PRs across all 4 lifts, newest first. */
function collectRecentPRs(lifts: LiftStats[], limit = 8): LiftPr[] {
  const all: LiftPr[] = [];
  for (const l of lifts) all.push(...l.prs);
  all.sort((a, b) => (a.date < b.date ? 1 : -1));
  return all.slice(0, limit);
}
