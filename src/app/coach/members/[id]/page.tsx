import { notFound } from "next/navigation";
import Link from "next/link";
import Container from "@/components/Container";
import { getMemberDetail } from "@/lib/data/coach";
import { getSession } from "@/lib/auth";
import { SUPABASE_ENABLED } from "@/lib/supabase/env";
import {
  getOrCreateConversation,
  listMessages,
} from "@/lib/data/messages";
import MessagesView from "@/components/chat/MessagesView";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Planlagt",
  active:    "Aktiv",
  completed: "Færdig",
  skipped:   "Sprunget over",
};

export default async function CoachMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMemberDetail(id);
  if (!m) notFound();

  // Coach-side chat: resolve thread + initial messages so the panel
  // streams with content. Realtime channel takes over for new
  // arrivals client-side.
  const coach = await getSession();
  let chatConvId: string | null = null;
  let chatInitial: Awaited<ReturnType<typeof listMessages>> = [];
  if (SUPABASE_ENABLED && coach?.isCoach) {
    chatConvId = await getOrCreateConversation(id, coach.id);
    if (chatConvId) chatInitial = await listMessages(chatConvId);
  }

  const programPct =
    m.programWeek != null && m.programWeeks
      ? (m.programWeek / m.programWeeks) * 100
      : 0;

  return (
    <Container className="py-6 lg:py-12 space-y-8">
      <Link
        href="/coach/members"
        className="text-xs font-mono uppercase tracking-[0.14em] text-fg-dim hover:text-fg"
      >
        ← Alle medlemmer
      </Link>

      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">{m.tier}</div>
          <h1 className="font-display text-[clamp(2.4rem,7vw,4rem)] leading-[0.95]">
            @{m.handle}
          </h1>
          <p className="mt-2 text-fg-dim text-sm">
            Medlem siden {new Date(m.joinedAt).toLocaleDateString("da-DK")}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="eyebrow mb-1">Reps</div>
          <div className="numeric text-3xl">{m.repsBalance}</div>
        </div>
      </header>

      {/* Profile */}
      <section className="surface-2 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b hairline">
          <div className="eyebrow mb-1">Profil</div>
          <h2 className="font-display text-xl">Fra onboarding</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-line">
          <Field label="Mål" value={m.goalFocus ?? "—"} />
          <Field label="Niveau" value={m.experienceLevel ?? "—"} />
          <Field label="Frekvens" value={m.weeklyFrequency ? `${m.weeklyFrequency} dg/uge` : "—"} />
          <Field label="Udstyr" value={m.equipmentLevel ?? "—"} />
          <Field label="Squat" value={m.maxSquatKg != null ? `${m.maxSquatKg} kg` : "—"} />
          <Field label="Bench" value={m.maxBenchKg != null ? `${m.maxBenchKg} kg` : "—"} />
          <Field label="Deadlift" value={m.maxDeadliftKg != null ? `${m.maxDeadliftKg} kg` : "—"} />
          <Field label="OHP" value={m.maxOhpKg != null ? `${m.maxOhpKg} kg` : "—"} />
        </div>
        {m.notesInjuries ? (
          <div className="px-5 py-4 border-t hairline">
            <div className="eyebrow mb-1">Noter / skader</div>
            <p className="text-sm text-fg/90">{m.notesInjuries}</p>
          </div>
        ) : null}
      </section>

      {/* Active program */}
      <section className="surface-2 rounded-2xl p-5 lg:p-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="eyebrow mb-1">Aktivt program</div>
            <div className="font-display text-2xl md:text-3xl">
              {m.programName ?? "Intet aktivt program"}
            </div>
          </div>
          {m.programCode ? (
            <div className="text-right">
              <div className="numeric text-3xl">
                {String(m.programWeek ?? 0).padStart(2, "0")}{" "}
                <span className="text-fg-dim text-base">/ {m.programWeeks ?? "—"}</span>
              </div>
              <div className="eyebrow">uger</div>
            </div>
          ) : null}
        </div>
        {m.programCode ? (
          <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
            <div className="h-full bg-fg" style={{ width: `${programPct}%` }} />
          </div>
        ) : null}
      </section>

      {/* Recent sessions */}
      <section>
        <div className="eyebrow mb-3">Senere sessioner</div>
        <ul className="surface-2 rounded-2xl divide-y hairline overflow-hidden">
          {m.recentSessions.length === 0 ? (
            <li className="px-5 py-6 text-sm text-fg-dim">Ingen sessioner endnu.</li>
          ) : (
            m.recentSessions.map((s) => (
              <li key={s.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                <span className="numeric text-fg-faint w-16 shrink-0 text-xs">
                  {s.scheduledFor ?? "—"}
                </span>
                <span className="flex-1 truncate">{s.dayLabel}</span>
                <span
                  className="text-[10px] font-mono uppercase tracking-[0.14em] border hairline-strong rounded-full px-2 py-0.5 shrink-0"
                  style={{
                    color: s.status === "completed" ? "var(--fg)" : "var(--fg-dim)",
                  }}
                >
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
                <Link
                  href={`/coach/sessions/${s.id}/edit`}
                  className="btn btn-sm btn-ghost shrink-0"
                >
                  Rediger
                </Link>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Chat */}
      {coach?.isCoach ? (
        <section>
          <div className="eyebrow mb-3">Chat med @{m.handle}</div>
          <div
            className="surface-2 rounded-2xl overflow-hidden flex flex-col"
            style={{ height: "560px" }}
          >
            <MessagesView
              conversationId={chatConvId}
              initialMessages={chatInitial}
              myMemberId={coach.id}
              canSendVideo={true}
            />
          </div>
        </section>
      ) : null}

      {/* Form-checks */}
      <section>
        <div className="eyebrow mb-3">Form-checks ({m.formChecks.length})</div>
        {m.formChecks.length === 0 ? (
          <div className="surface-2 rounded-2xl p-5 text-sm text-fg-dim">
            Ingen form-checks endnu.
          </div>
        ) : (
          <ul className="space-y-3">
            {m.formChecks.map((f) => (
              <li key={f.id} className="surface-2 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm">{f.exerciseName ?? "Form-check"}</div>
                  <div className="numeric text-sm">
                    {f.aiScore != null ? `${f.aiScore}/100` : ""}
                  </div>
                </div>
                {f.aiHeadline ? (
                  <p className="text-fg/90 text-sm leading-relaxed">{f.aiHeadline}</p>
                ) : null}
                <div className="mt-2 text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                  {f.reviewedAt ? "Reviewed" : "Afventer review"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Reps history */}
      <section>
        <div className="eyebrow mb-3">Reps-historik</div>
        <ul className="surface-2 rounded-2xl divide-y hairline overflow-hidden">
          {m.recentTx.length === 0 ? (
            <li className="px-5 py-6 text-sm text-fg-dim">Ingen transaktioner endnu.</li>
          ) : (
            m.recentTx.map((t) => (
              <li key={t.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                <span className="numeric text-xs text-fg-faint w-20 shrink-0">
                  {new Date(t.createdAt).toLocaleDateString("da-DK")}
                </span>
                <span className="flex-1 truncate">{t.reason}</span>
                <span className="numeric text-fg/90 shrink-0">
                  {t.delta > 0 ? "+" : ""}
                  {t.delta}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </Container>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg-2 px-4 py-3">
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  );
}
