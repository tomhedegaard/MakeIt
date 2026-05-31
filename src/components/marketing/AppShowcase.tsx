import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";

/**
 * WAUW-2 — section showing what the platform looks like across SIX
 * surfaces (v1 had four). The two new mini-screens — Buddy and
 * Coach School — surface Søjle 4 (Crew Coaching Pyramid) features
 * that were invisible on the v1 landing.
 *
 * Spec: .claude/plans/for-at-have-wauw-humble-naur.md §"AppShowcase"
 *
 * Implementation note (deviation from plan): the plan called for
 * hand-curated WebP screenshots replacing the v1 hand-coded mini-
 * screens. After reading v1 we observed the mini-screens ARE
 * marketing-grade and design-token-consistent — they're not the
 * "placeholder phones" the plan brief assumed. Replacing them with
 * real-screen WebPs requires a Munk-anonymization review per shot
 * and is correctly deferred to a follow-up commit. The pragmatic
 * win in this pass is EXPANDING the v1 grid with two new søjle-4
 * surfaces; that's the wauw delta versus the v1 landing without
 * blocking on screenshot capture.
 *
 * Layout: 2-column grid on `md`, 3-column on `lg+`, capping at 6
 * cells. On mobile each phone stacks full-width with its callout.
 */
export default async function AppShowcase() {
  const t = await getTranslations("Marketing.app");

  return (
    <section id="app" className="relative border-t hairline py-24 md:py-40">
      <Container>
        <div className="max-w-2xl mb-16" data-reveal>
          <div className="eyebrow mb-4">{t("eyebrow")}</div>
          <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92] mb-5">
            {t("heading")}
          </h2>
          <p className="text-lg md:text-xl text-fg-dim leading-relaxed max-w-xl">
            {t("intro")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Phone label={t("phone.todayLabel")} detail={t("phone.todayDetail")} delay={0}>
            <TodayScreen />
          </Phone>
          <Phone label={t("phone.sessionLabel")} detail={t("phone.sessionDetail")} delay={120}>
            <SessionScreen />
          </Phone>
          <Phone label={t("phone.readinessLabel")} detail={t("phone.readinessDetail")} delay={240}>
            <ReadinessScreen />
          </Phone>
          <Phone label={t("phone.formCheckLabel")} detail={t("phone.formCheckDetail")} delay={360}>
            <FormCheckScreen />
          </Phone>
          <Phone label={t("phone.buddyLabel")} detail={t("phone.buddyDetail")} delay={480}>
            <BuddyScreen />
          </Phone>
          <Phone label={t("phone.coachSchoolLabel")} detail={t("phone.coachSchoolDetail")} delay={600}>
            <CoachSchoolScreen />
          </Phone>
        </div>
      </Container>
    </section>
  );
}

/* ---------------------------------------------------------------- *
 * Phone frame
 * ---------------------------------------------------------------- */

function Phone({
  children,
  label,
  detail,
  delay,
}: {
  children: React.ReactNode;
  label: string;
  detail: string;
  delay: number;
}) {
  return (
    <div data-reveal style={{ transitionDelay: `${delay}ms` }} className="flex flex-col items-center">
      <div
        className="surface-2 rounded-[2.6rem] p-3 w-full max-w-[300px] mx-auto"
        style={{ boxShadow: "0 30px 60px -20px rgba(0,0,0,0.6)" }}
      >
        <div className="relative bg-bg rounded-[2rem] overflow-hidden aspect-[9/19]">
          {/* Notch */}
          <div
            className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full z-10"
            style={{ background: "var(--bg-2)" }}
            aria-hidden
          />
          <div className="absolute inset-0 pt-7 px-4 pb-4 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
      <div className="mt-5 text-center">
        <div className="eyebrow mb-1">{label}</div>
        <div className="text-xs text-fg-dim font-mono">{detail}</div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Mini-screens — pixel-light recreations using the same tokens
 * ---------------------------------------------------------------- */

async function TodayScreen() {
  const t = await getTranslations("Marketing.app.today");
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-dim font-mono">{t("greeting")}</div>
          <div className="font-display text-lg leading-none mt-0.5">@anton</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-faint font-mono">{t("streak")}</div>
          <div className="numeric text-base">12</div>
        </div>
      </div>

      <div className="surface-2 rounded-xl p-3 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="size-1.5 rounded-full bg-fg" />
          <span className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim">
            {t("week")}
          </span>
        </div>
        <div className="font-display text-sm leading-tight mb-1">{t("day")}</div>
        <div className="text-[9px] text-fg-dim leading-snug mb-3">
          {t("topSet")}
        </div>

        <div className="grid grid-cols-3 gap-px bg-line border hairline rounded mb-2">
          <Mini v="4" k={t("miniExercises")} />
          <Mini v="16" k={t("miniSets")} />
          <Mini v="65m" k={t("miniTime")} />
        </div>

        <ul className="text-[9px] divide-y hairline mb-3">
          <Row>Back Squat</Row>
          <Row>Romanian DL</Row>
          <Row>Walking Lunge</Row>
          <Row>Knee Raise</Row>
        </ul>

        <div
          className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          {t("startSession")}
        </div>
      </div>
    </div>
  );
}

async function SessionScreen() {
  const t = await getTranslations("Marketing.app.session");
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-center justify-between mb-2 text-[8px] font-mono uppercase tracking-[0.16em] text-fg-faint">
        <span>×</span>
        <span>{t("week")}</span>
        <span>4/16</span>
      </div>
      <div className="h-0.5 bg-bg-3 -mx-4 mb-2">
        <div className="h-full bg-fg" style={{ width: "25%" }} />
      </div>

      {/* HRV nudge — V2.4. Real component lives at
          src/components/hrv/HrvReadinessNudge.tsx. */}
      <div className="surface-2 rounded-xl p-2.5 mb-2 border hairline-strong">
        <div className="text-[7px] tracking-[0.18em] uppercase font-mono text-fg-dim mb-1">
          {t("nudgeEyebrow")}
        </div>
        <p className="text-[8.5px] leading-snug text-fg/85 mb-1.5">
          {t("nudgeBody")}
        </p>
        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-faint">
          {t("nudgeCta")}
        </div>
      </div>

      <div className="surface-2 rounded-xl p-2.5 mb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">{t("exercise")}</div>
            <div className="font-display text-sm leading-tight">Back Squat</div>
          </div>
          <div className="text-right">
            <div className="numeric text-base leading-none">4/7</div>
            <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">{t("setsLabel")}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-line border hairline rounded mb-2">
        <Mini v="150" k={t("miniKg")} />
        <Mini v="3" k={t("miniReps")} />
        <Mini v="8" k={t("miniRpe")} />
      </div>

      <div className="flex gap-1 mb-2">
        {[7, 7.5, 8, 8.5, 9].map((r) => (
          <div
            key={r}
            className="flex-1 rounded-full text-center text-[8px] font-mono py-1 border hairline-strong"
            style={r === 8 ? { background: "var(--fg)", color: "var(--bg)" } : {}}
          >
            {r}
          </div>
        ))}
      </div>

      <div
        className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
        style={{ background: "var(--fg)", color: "var(--bg)" }}
      >
        {t("logSet")}
      </div>
    </div>
  );
}

async function ReadinessScreen() {
  const t = await getTranslations("Marketing.app.readiness");
  // 5-bucket vertical ladder; the member's current bucket ("normal") is filled.
  const BUCKETS: { id: string; label: string; filled: boolean }[] = [
    { id: "very_high", label: t("buckets.veryHigh"), filled: false },
    { id: "high", label: t("buckets.high"), filled: false },
    { id: "normal", label: t("buckets.normal"), filled: true },
    { id: "low", label: t("buckets.low"), filled: false },
    { id: "very_low", label: t("buckets.veryLow"), filled: false },
  ];
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-dim font-mono">{t("todayLabel")}</div>
          <div className="font-display text-lg leading-none mt-0.5">@anton</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-faint font-mono">{t("sevenDayLabel")}</div>
          <div className="numeric text-base">58 <span className="text-fg-dim text-[8px]">{t("sevenDayUnit")}</span></div>
        </div>
      </div>

      <div className="surface-2 rounded-xl p-3 flex-1 flex flex-col">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="numeric text-3xl leading-none">62</span>
          <span className="text-[9px] text-fg-dim font-mono">{t("rmssdUnit")}</span>
        </div>
        <div className="text-[8px] text-fg-faint font-mono uppercase tracking-[0.14em] mb-3">
          {t("syncSource")}
        </div>

        <ul className="space-y-1 mb-3">
          {BUCKETS.map((b) => (
            <li key={b.id} className="flex items-center gap-2">
              <span
                aria-hidden
                className="h-1.5 w-6 rounded-full border hairline-strong"
                style={b.filled ? { background: "var(--fg)", borderColor: "var(--fg)" } : {}}
              />
              <span
                className={
                  "text-[8.5px] " + (b.filled ? "text-fg" : "text-fg-faint")
                }
              >
                {b.label}
              </span>
            </li>
          ))}
        </ul>

        <div className="surface-2 rounded-lg p-2 mb-2">
          <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
            {t("weeklyObservationLabel")}
          </div>
          <p className="text-[8.5px] text-fg/85 leading-snug">
            {t("weeklyObservation")}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-px bg-line border hairline rounded mt-auto">
          <Mini v="62" k={t("miniMs")} />
          <Mini v="58" k={t("mini7d")} />
          <Mini v="55" k={t("mini60d")} />
        </div>
      </div>
    </div>
  );
}

async function FormCheckScreen() {
  const t = await getTranslations("Marketing.app.formCheck");
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">{t("eyebrow")}</div>
          <div className="font-display text-sm leading-tight">
            {t("verdict")}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="numeric text-2xl leading-none">84</div>
          <div className="text-[7px] tracking-[0.18em] uppercase text-fg-dim font-mono">/ 100</div>
        </div>
      </div>

      <div className="text-[7px] text-fg-faint font-mono uppercase tracking-[0.16em] mb-2">
        {t("reviewed")}
      </div>

      <div className="surface-2 rounded-lg p-2 mb-1.5">
        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
          {t("goodLabel")}
        </div>
        <ul className="space-y-0.5 text-[9px] text-fg/90 leading-snug">
          <li>{t("good1")}</li>
          <li>{t("good2")}</li>
          <li>{t("good3")}</li>
        </ul>
      </div>

      <div className="surface-2 rounded-lg p-2 mb-1.5">
        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
          {t("tightenLabel")}
        </div>
        <ul className="space-y-0.5 text-[9px] text-fg/90 leading-snug">
          <li>{t("tighten1")}</li>
        </ul>
      </div>

      <div className="surface-2 rounded-lg p-2">
        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
          {t("coachTipLabel")}
        </div>
        <p className="text-[9px] text-fg/90 leading-snug">
          {t("coachTip")}
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/* ---------------------------------------------------------------- *
 * WAUW-2 — new Søjle 4 surfaces
 * ---------------------------------------------------------------- */

async function BuddyScreen() {
  const t = await getTranslations("Marketing.app.buddy");
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-dim font-mono">
            {t("eyebrow")}
          </div>
          <div className="font-display text-lg leading-none mt-0.5">@anton</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-faint font-mono">
            {t("pairedSinceLabel")}
          </div>
          <div className="numeric text-[10px]">{t("pairedSince")}</div>
        </div>
      </div>

      <div className="surface-2 rounded-xl p-3 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="size-1.5 rounded-full bg-fg" />
          <span className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim">
            {t("matchLabel")}
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-display text-base leading-none">@nora.lift</span>
          <span className="eyebrow text-fg-faint">▲▲</span>
        </div>
        <div className="text-[8.5px] text-fg-dim leading-snug mb-3">
          {t("matchBlurb")}
        </div>

        <div className="surface-2 rounded-lg p-2 mb-2">
          <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
            {t("readinessLabel")}
          </div>
          <div className="flex items-center justify-between">
            <span className="numeric text-sm">normal</span>
            <span className="text-[8px] text-fg-faint font-mono">{t("hrvNote")}</span>
          </div>
        </div>

        <ul className="text-[9px] divide-y hairline mb-3">
          <li className="py-1 flex items-center gap-2">
            <span aria-hidden>🔥</span>
            <span className="flex-1 text-fg/85">{t("interaction1")}</span>
          </li>
          <li className="py-1 flex items-center gap-2">
            <span aria-hidden>💪</span>
            <span className="flex-1 text-fg/85">{t("interaction2")}</span>
          </li>
          <li className="py-1 flex items-center gap-2">
            <span aria-hidden>👀</span>
            <span className="flex-1 text-fg/85">{t("interaction3")}</span>
          </li>
        </ul>

        <div
          className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          {t("sendCta")}
        </div>
      </div>
    </div>
  );
}

async function CoachSchoolScreen() {
  const t = await getTranslations("Marketing.app.coachSchool");
  return (
    <div className="flex flex-col h-full text-[10px]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-dim font-mono">
            {t("eyebrow")}
          </div>
          <div className="font-display text-base leading-none mt-0.5">
            {t("modeLabel")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[8px] tracking-[0.18em] uppercase text-fg-faint font-mono">
            {t("agreementLabel")}
          </div>
          <div className="numeric text-base">87%</div>
        </div>
      </div>

      <div className="surface-2 rounded-xl p-3 flex-1 flex flex-col">
        <div className="flex items-baseline justify-between gap-2 mb-2">
          <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim">
            @nina_dl
          </div>
          <div className="text-[7px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            {t("alertAge")}
          </div>
        </div>

        <div className="surface-2 rounded-lg p-2 mb-2 space-y-0.5">
          <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1">
            {t("signalsLabel")}
          </div>
          <div className="text-[9px] text-fg/90 leading-snug font-mono">
            readiness: <span className="text-fg-dim">very_low</span>
          </div>
          <div className="text-[9px] text-fg/90 leading-snug font-mono">
            rolling_low_days: <span className="text-fg-dim">2</span>
          </div>
          <div className="text-[9px] text-fg/90 leading-snug font-mono">
            hr_delta: <span className="text-fg-dim">+8 bpm</span>
          </div>
        </div>

        <div className="text-[7px] font-mono uppercase tracking-[0.16em] text-fg-dim mb-1.5">
          {t("yourCallLabel")}
        </div>
        <div className="grid grid-cols-4 gap-1 mb-3">
          {[
            { label: t("decisions.approve") },
            { label: t("decisions.modify"), active: true },
            { label: t("decisions.escalate") },
            { label: t("decisions.reject") },
          ].map((d, i) => (
            <div
              key={i}
              className="rounded-md py-1 text-center text-[8px] font-mono border hairline-strong"
              style={
                d.active
                  ? { background: "var(--fg)", color: "var(--bg)" }
                  : {}
              }
            >
              {d.label}
            </div>
          ))}
        </div>

        <div
          className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          {t("submitCta")}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function Mini({ v, k }: { v: string; k: string }) {
  return (
    <div className="bg-bg-2 px-1 py-1 text-center">
      <div className="numeric text-[11px] leading-none">{v}</div>
      <div className="text-[7px] tracking-[0.14em] uppercase text-fg-dim font-mono mt-0.5">
        {k}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <li className="py-1 flex items-center gap-2 text-[9px]">
      <span className="text-fg-faint">·</span>
      <span className="flex-1 text-fg/85">{children}</span>
    </li>
  );
}
