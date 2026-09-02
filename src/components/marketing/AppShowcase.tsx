import { getTranslations } from "next-intl/server";
import Container from "@/components/Container";
import { domainTags } from "@/components/marketing/domainTags";
import {
  MarketingDomainKicker,
  MarketingFigure,
} from "@/components/marketing/FigureLanguage";
import type { Domain } from "@/components/brand/DomainMark";
import {
  SHOWCASE_SPARK_LAYOUT,
  getShowcaseMindDay,
  sparkPath,
  sparkX,
  sparkY,
} from "@/lib/marketing/mind-showcase";
import { getShowcaseNutritionDay } from "@/lib/marketing/nutrition-showcase";

/**
 * Eight mini-phones: Today, Session, Kost, Readiness, Sind,
 * Form-check, Buddy, Coach School. Domain phones sit Session → Kost →
 * Readiness → Sind so the four-domain story reads body → food →
 * heart → mind. On `lg` that is row 1 …body/food and row 2 heart/mind.
 *
 * Layout: `md:grid-cols-2 lg:grid-cols-3` — a 3+3+2 wrap is fine.
 * Buddy and Coach School stay; they are not replaced by food or mind.
 */
export default async function AppShowcase() {
  const t = await getTranslations("Marketing.app");
  const nutrition = getShowcaseNutritionDay();

  return (
    <section id="app" className="relative border-t hairline py-20 md:py-28">
      <Container>
        <div
          className="mb-16 grid gap-10 md:grid-cols-12 md:items-center"
          data-reveal
        >
          <div className="md:col-span-8 max-w-2xl">
            <div className="eyebrow mb-4">{t("eyebrow")}</div>
            <h2 className="font-display text-[clamp(2.4rem,7vw,5.5rem)] leading-[0.92] mb-5">
              {t("heading")}
            </h2>
            <p className="text-lg md:text-xl text-fg-dim leading-relaxed max-w-xl">
              {t.rich("intro", domainTags)}
            </p>
          </div>
          <div className="md:col-span-4 flex justify-start md:justify-end">
            <MarketingFigure
              ariaLabel={t("figureAria")}
              className="h-44 md:h-56 w-auto"
            />
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Phone label={t("phone.todayLabel")} detail={t("phone.todayDetail")} delay={0}>
            <TodayScreen />
          </Phone>
          <Phone label={t("phone.sessionLabel")} detail={t("phone.sessionDetail")} delay={120} domain="body">
            <SessionScreen />
          </Phone>
          <Phone
            label={t("phone.nutritionLabel")}
            detail={t("phone.nutritionDetail")}
            photoBy={t("nutrition.photoBy", { names: nutrition.photographers.join(", ") })}
            delay={240}
            domain="food"
          >
            <NutritionScreen />
          </Phone>
          <Phone label={t("phone.readinessLabel")} detail={t("phone.readinessDetail")} delay={360} domain="heart">
            <ReadinessScreen />
          </Phone>
          <Phone label={t("phone.mindLabel")} detail={t("phone.mindDetail")} delay={480} domain="mind">
            <MindScreen />
          </Phone>
          <Phone label={t("phone.formCheckLabel")} detail={t("phone.formCheckDetail")} delay={600} domain="body">
            <FormCheckScreen />
          </Phone>
          <Phone label={t("phone.buddyLabel")} detail={t("phone.buddyDetail")} delay={720}>
            <BuddyScreen />
          </Phone>
          <Phone label={t("phone.coachSchoolLabel")} detail={t("phone.coachSchoolDetail")} delay={840}>
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
  photoBy,
  delay,
  domain,
}: {
  children: React.ReactNode;
  label: string;
  detail: string;
  photoBy?: string;
  delay: number;
  /** Optional domain hue for the callout (docs/DOMAIN_COLOR_SYSTEM.md) */
  domain?: Domain;
}) {
  return (
    <div
      data-reveal
      data-domain={domain}
      style={{ transitionDelay: `${delay}ms` }}
      className="flex flex-col items-center"
    >
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
        {domain ? (
          <MarketingDomainKicker
            domain={domain}
            label={label}
            className="mb-1 justify-center"
          />
        ) : (
          <div className="eyebrow mb-1">{label}</div>
        )}
        <div className="text-xs text-fg-dim font-mono">{detail}</div>
        {photoBy ? (
          <div className="mt-1 text-[9px] text-fg-faint font-mono">{photoBy}</div>
        ) : null}
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

      <div className="flex items-center justify-center mb-2">
        <MarketingFigure
          ariaLabel={t("figureAria")}
          className="h-[4.5rem] w-auto"
        />
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

async function NutritionScreen() {
  const t = await getTranslations("Marketing.app.nutrition");
  const { meals } = getShowcaseNutritionDay();
  const todayKcal = meals.reduce((sum, m) => sum + m.estKcal, 0);
  const todayProtein = meals.reduce((sum, m) => sum + m.estProteinG, 0);

  return (
    <div className="flex flex-col h-full text-[10px]" data-domain="food">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[8px] tracking-[0.18em] uppercase font-mono eyebrow-domain mb-1">
            {t("kicker")}
          </div>
          <span className="domain-stroke" aria-hidden />
        </div>
        <div className="text-right">
          <div className="numeric text-base leading-none">{todayKcal}</div>
          <div className="text-[7px] tracking-[0.18em] uppercase text-fg-faint font-mono">
            {t("kcal")} · {t("proteinUnit", { protein: todayProtein })}
          </div>
        </div>
      </div>

      <div className="surface-2 rounded-xl p-2 flex-1 flex flex-col">
        <ul className="divide-y hairline flex-1">
          {meals.map((meal) => (
            <li key={meal.slot} className="flex items-center gap-2 py-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meal.imageSrc}
                alt=""
                width={36}
                height={36}
                className="size-9 rounded-md object-cover shrink-0 hairline border"
              />
              <div className="flex-1 min-w-0">
                <div className="text-[7px] tracking-[0.16em] uppercase text-fg-dim font-mono">
                  {meal.slot === "frokost"
                    ? t("slotFrokost")
                    : meal.slot === "aften"
                      ? t("slotAften")
                      : t("slotMorgen")}
                </div>
                <div className="font-display text-[11px] leading-tight truncate">
                  {meal.title}
                </div>
                <div className="text-[8px] font-mono text-fg-faint">
                  {t("macros", {
                    kcal: meal.estKcal,
                    protein: meal.estProteinG,
                    min: meal.prepMinutes,
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div
          className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          {t("openPlan")}
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

async function MindScreen() {
  const t = await getTranslations("Marketing.app.mind");
  const { today, series } = getShowcaseMindDay();
  const layout = SHOWCASE_SPARK_LAYOUT;
  const energy = series.map((p) => p.energy);
  const stress = series.map((p) => p.stress);
  const focus = series.map((p) => p.focus);
  const last = series.length - 1;
  const checks = [
    { key: "energy" as const, label: t("energy"), value: today.energy, token: "var(--mind-energy)" },
    { key: "stress" as const, label: t("stress"), value: today.stress, token: "var(--mind-stress)" },
    { key: "focus" as const, label: t("focus"), value: today.focus, token: "var(--mind-focus)" },
  ];

  return (
    <div className="flex flex-col h-full text-[10px]" data-domain="mind">
      <div className="flex items-end justify-between mb-2">
        <div>
          <div className="text-[8px] tracking-[0.18em] uppercase font-mono eyebrow-domain mb-1">
            {t("kicker")}
          </div>
          <span className="domain-stroke" aria-hidden />
        </div>
        <div className="text-right">
          <div className="numeric text-base leading-none">{t("numeric")}</div>
          <div className="text-[7px] tracking-[0.18em] uppercase text-fg-faint font-mono">
            {t("numericUnit")}
          </div>
        </div>
      </div>

      <div className="surface-2 rounded-xl p-2 flex-1 flex flex-col">
        <div className="text-[7px] tracking-[0.16em] uppercase text-fg-dim font-mono mb-1.5">
          {t("checkEyebrow")}
        </div>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {checks.map((c) => (
            <div key={c.key} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <span
                  className="rounded-full shrink-0"
                  style={{ width: 6, height: 6, background: c.token }}
                  aria-hidden
                />
                <span className="text-[7px] tracking-[0.12em] uppercase text-fg-dim font-mono">
                  {c.label}
                </span>
              </div>
              <div className="numeric text-[11px] leading-none text-fg">
                {t("score", { n: c.value })}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[7px] tracking-[0.16em] uppercase text-fg-dim font-mono mb-1">
          {t("graphLabel")}
        </div>
        <svg
          viewBox={`0 0 ${layout.w} ${layout.h}`}
          className="w-full flex-1 min-h-0"
          role="img"
          aria-label={t("graphAria")}
        >
          {[1, 3, 5].map((v) => (
            <g key={v}>
              <line
                x1={layout.padL}
                x2={layout.w - layout.padR}
                y1={sparkY(v, layout)}
                y2={sparkY(v, layout)}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeDasharray="2 4"
              />
              <text
                x={layout.padL - 3}
                y={sparkY(v, layout) + 2.5}
                fontSize={7}
                textAnchor="end"
                fill="currentColor"
                opacity={0.4}
              >
                {v}
              </text>
            </g>
          ))}
          <path
            d={sparkPath(stress, layout, true)}
            fill="none"
            stroke="var(--mind-stress)"
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={sparkPath(focus, layout)}
            fill="none"
            stroke="var(--mind-focus)"
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={sparkPath(energy, layout)}
            fill="none"
            stroke="var(--mind-energy)"
            strokeWidth={1.4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={sparkX(last, series.length, layout)}
            cy={sparkY(stress[last], layout, true)}
            r={2}
            fill="var(--mind-stress)"
          />
          <circle
            cx={sparkX(last, series.length, layout)}
            cy={sparkY(focus[last], layout)}
            r={2}
            fill="var(--mind-focus)"
          />
          <circle
            cx={sparkX(last, series.length, layout)}
            cy={sparkY(energy[last], layout)}
            r={2}
            fill="var(--mind-energy)"
          />
        </svg>

        <div
          className="mt-auto rounded-full text-center py-2 font-mono text-[9px] tracking-[0.18em] uppercase font-medium"
          style={{ background: "var(--fg)", color: "var(--bg)" }}
        >
          {t("cta")}
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
