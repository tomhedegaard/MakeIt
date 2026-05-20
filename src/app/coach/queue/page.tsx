import Link from "next/link";
import Container from "@/components/Container";
import { getOpenHrvAlerts, getPendingFormChecks } from "@/lib/data/coach";
import CoachReviewButton from "@/components/coach/CoachReview";
import HrvAlertCard from "@/components/coach/HrvAlertCard";

export default async function CoachQueuePage() {
  const [hrvAlerts, pending] = await Promise.all([
    getOpenHrvAlerts(50),
    getPendingFormChecks(50),
  ]);

  return (
    <Container className="py-6 lg:py-12 space-y-6">
      <header className="pt-2 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow mb-2">Coach console</div>
          <h1 className="font-display text-[clamp(2rem,6vw,3rem)] leading-[0.95]">
            Coach-kø
          </h1>
          <p className="mt-2 text-fg-dim text-sm">
            {pending.length} form-checks · {hrvAlerts.length} HRV-anomalier venter.
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <div>
          <div className="eyebrow mb-2">HRV-anomalier</div>
          <h2 className="font-display text-2xl">
            {hrvAlerts.length} venter på handling.
          </h2>
        </div>

        {hrvAlerts.length === 0 ? (
          <p className="text-fg-faint text-sm">
            Ingen HRV-anomalier kræver handling lige nu.
          </p>
        ) : (
          <ul className="space-y-3">
            {hrvAlerts.map((a) => (
              <li key={a.id}>
                <HrvAlertCard alert={a} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div>
        <div className="eyebrow mb-2">Form-checks</div>
        <h2 className="font-display text-2xl">
          {pending.length} venter på review.
        </h2>
      </div>

      {pending.length === 0 ? (
        <div className="surface-2 rounded-2xl p-8 text-center">
          <div className="font-display text-2xl mb-2">Køen er tom.</div>
          <p className="text-fg-dim text-sm">
            Alle form-checks er gennemgået. Godt arbejde.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {pending.map((f) => (
            <li key={f.id} className="surface-2 rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <div className="text-sm">
                    <Link
                      href={`/coach/members/${f.memberId}`}
                      className="hover:underline"
                    >
                      @{f.memberHandle}
                    </Link>
                  </div>
                  <div className="text-[11px] font-mono text-fg-faint">
                    {f.exerciseName ?? "Form-check"} ·{" "}
                    {new Date(f.createdAt).toLocaleString("da-DK", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="numeric text-2xl">{f.aiScore ?? "—"}</div>
                  <div className="eyebrow">/ 100</div>
                </div>
              </div>

              {f.aiHeadline ? (
                <p className="text-fg/90 text-sm leading-relaxed mb-3">
                  {f.aiHeadline}
                </p>
              ) : null}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint">
                  Afventer review
                </span>
                <CoachReviewButton formCheck={f} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
