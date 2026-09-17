import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import SessionScreen from "@/components/marketing/phone/screens/SessionScreen";
import HrvScreen from "@/components/marketing/phone/screens/HrvScreen";
import FoodScreen from "@/components/marketing/phone/screens/FoodScreen";
import MindScreen from "@/components/marketing/phone/screens/MindScreen";
import FormCheckScreen from "@/components/marketing/phone/screens/FormCheckScreen";
import type { Domain } from "@/components/marketing/phone/screens/parts";
import { cn } from "@/lib/utils";
import Rule from "./Rule";
import ScreenRack from "./ScreenRack";

const RACK_PHONE_WIDTH = 272;

/** Today's 16 sets: 7 done at the top set, then backoff and lighter work. */
const SET_TICKS = [
  ...Array.from({ length: 7 }, () => ({ h: 40, done: true })),
  { h: 40, done: false },
  ...Array.from({ length: 5 }, () => ({ h: 28, done: false })),
  ...Array.from({ length: 3 }, () => ({ h: 18, done: false })),
];

/** Fourteen nights of HRV as bars; the last one is last night. */
const HRV_BARS = [40, 30, 36, 24, 42, 34, 27, 48, 36, 30, 56, 66, 73] as const;
const HRV_TONIGHT = 80;

/** Share of the day's energy per macro, as in the food screen. */
const MACROS = [
  { key: "p", flex: 27, tone: "bg-domain" },
  { key: "c", flex: 43, tone: "bg-[color-mix(in_oklab,var(--domain)_45%,transparent)]" },
  { key: "f", flex: 30, tone: "bg-[color-mix(in_oklab,var(--domain)_20%,transparent)]" },
] as const;

const MIND_SCALES = ["energy", "stress", "focus"] as const;

/**
 * Four systems (reference B `.bento`) and the app rack below them.
 * Server component; only the rack controls are a client island. The
 * heart cell is a plain `data-theme="nat"` block, dark on the Kalk page.
 */
export default function SystemsBento() {
  const t = useTranslations("Marketing.kalk.systems");
  const s = useTranslations("Marketing.kalk.screens");
  const hrv = useTranslations("Marketing.kalk.engine.steps.hrv");
  const unit = useTranslations("Marketing.kalk.hero")("plateUnit");

  const screens = [
    { key: "session", node: <SessionScreen width={RACK_PHONE_WIDTH} /> },
    { key: "hrv", node: <HrvScreen width={RACK_PHONE_WIDTH} /> },
    { key: "food", node: <FoodScreen width={RACK_PHONE_WIDTH} /> },
    { key: "mind", node: <MindScreen width={RACK_PHONE_WIDTH} /> },
    { key: "formCheck", node: <FormCheckScreen width={RACK_PHONE_WIDTH} /> },
  ];

  return (
    <section
      id="systems"
      aria-labelledby="systems-heading"
      className="scroll-mt-[68px] overflow-x-clip pb-[clamp(80px,10vw,150px)]"
    >
      <div className="mx-auto max-w-[1360px] px-4 md:px-8">
        <Rule />

        <div className="mb-12 mt-[clamp(48px,6vw,90px)] flex flex-wrap items-end justify-between gap-8">
          <h2 id="systems-heading" className="font-display max-w-[9em] text-[clamp(46px,6.4vw,96px)]">
            {t("heading")}
          </h2>
          <p className="max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("sub")}</p>
        </div>

        <div data-bento className="grid grid-cols-12 gap-3.5">
          <Cell cell="body" className="min-h-[450px] md:col-span-12 lg:col-span-7 lg:min-h-[420px]">
            <CellKicker domain="body">{t("body.kicker")}</CellKicker>
            <CellHeading>{t("body.heading")}</CellHeading>
            <p className="mt-3 max-w-[36ch] text-base text-fg-dim">{t("body.text")}</p>
            <div
              data-kg-ticks
              data-domain="body"
              aria-hidden="true"
              className="absolute bottom-8 left-[clamp(22px,2.4vw,34px)] flex items-end gap-[5px]"
            >
              {SET_TICKS.map((tick, i) => (
                <i
                  key={i}
                  style={{ height: tick.h }}
                  className={cn("block w-1.5 rounded-[2px]", tick.done ? "bg-domain" : "bg-line-bright")}
                />
              ))}
            </div>
            <p
              aria-label={`${t("body.stat")} ${t("body.statLabel")}`}
              className="font-display absolute bottom-[-0.12em] right-[clamp(16px,2vw,30px)] text-[200px] leading-[0.8]! tracking-[-0.03em]! md:text-[clamp(200px,24vw,360px)]"
            >
              {t("body.stat")}
              <small
                aria-hidden="true"
                className="absolute right-[0.1em] top-[-2.2em] whitespace-nowrap font-mono text-[12px] font-medium tracking-[0.1em]"
              >
                {t("body.statLabel")}
              </small>
            </p>
          </Cell>

          <Cell cell="food" className="md:col-span-6 lg:col-span-5">
            <CellKicker domain="food">{t("food.kicker")}</CellKicker>
            <CellHeading>{t("food.heading")}</CellHeading>
            <blockquote className="font-display mt-[18px] text-[clamp(24px,2.1vw,30px)] leading-none!">
              {t("food.quote")}
            </blockquote>
            <div data-domain="food" className="mt-auto pt-7">
              <p className="font-mono text-[12px] uppercase tracking-[0.06em]">{t("food.macro")}</p>
              <div aria-hidden="true" className="mt-2.5 flex h-3.5 gap-[3px] overflow-hidden rounded">
                {MACROS.map((m) => (
                  <i key={m.key} style={{ flex: m.flex }} className={cn("block", m.tone)} />
                ))}
              </div>
              <div aria-hidden="true" className="mt-2 flex justify-between font-mono text-[11px] text-fg-dim">
                {MACROS.map((m) => (
                  <span key={m.key}>{t(`food.${m.key}`)}</span>
                ))}
              </div>
            </div>
          </Cell>

          <Cell cell="heart" nat className="md:col-span-6 lg:col-span-5">
            <CellKicker domain="heart">{t("heart.kicker")}</CellKicker>
            <CellHeading>{t("heart.heading")}</CellHeading>
            <div className="mt-3 flex gap-7 font-mono text-[12px] uppercase tracking-[0.06em] text-fg-dim">
              <p>
                {t("heart.now")}
                <b data-domain="heart" className="font-display mt-1 block text-[36px] tracking-normal! text-domain">
                  {hrv("value")} {hrv("unit")}
                </b>
              </p>
              <p>
                {t("heart.avg")}
                <b className="font-display mt-1 block text-[36px] tracking-normal! text-fg">{s("hrv.avgValue")}</b>
              </p>
            </div>
            <div data-hrv-bars data-domain="heart" aria-hidden="true" className="mt-auto pt-[26px]">
              <svg viewBox="0 0 280 120" preserveAspectRatio="none" className="block h-[120px] w-full">
                <rect x="0" y="22" width="280" height="44" className="fill-domain-tint" />
                <g strokeWidth="3" strokeLinecap="round" className="stroke-line-bright">
                  {HRV_BARS.map((top, i) => (
                    <line key={i} x1={6 + i * 20} x2={6 + i * 20} y1="120" y2={top} />
                  ))}
                </g>
                <line x1="266" x2="266" y1="120" y2={HRV_TONIGHT} strokeWidth="5" strokeLinecap="round" className="stroke-domain" />
              </svg>
            </div>
            <p className="mt-3.5 text-[13px] text-fg-dim">{t("heart.disclaimer")}</p>
          </Cell>

          <Cell cell="mind" className="md:col-span-12 lg:col-span-7">
            <CellKicker domain="mind">{t("mind.kicker")}</CellKicker>
            <CellHeading>{t("mind.heading")}</CellHeading>
            <p className="mt-3 max-w-[36ch] text-base text-fg-dim">{t("mind.text")}</p>
            <MindScales />
          </Cell>
        </div>
      </div>

      <div data-rack aria-labelledby="rack-heading" role="region" className="mt-[clamp(80px,9vw,130px)]">
        <ScreenRack
          id="kalk-rack"
          listLabel={t("rack.listLabel")}
          prevLabel={t("rack.prev")}
          nextLabel={t("rack.next")}
          tag={t("rack.sample")}
          items={screens}
          head={
            <div>
              <h3 id="rack-heading" className="font-display text-[clamp(36px,4vw,56px)] leading-[0.9]!">
                {t("rack.heading")}
              </h3>
              <p className="mt-3 max-w-[46ch] text-[clamp(17px,1.35vw,20px)] text-fg-dim">{t("rack.sub")}</p>
            </div>
          }
        />
        <div aria-hidden="true" className="mx-auto max-w-[1360px] px-4 md:px-8">
          <div className="relative h-2.5 rounded-[5px] bg-[linear-gradient(var(--fg),var(--fg))] bg-[length:100%_2px] bg-center bg-no-repeat before:absolute before:left-0 before:top-0 before:size-2.5 before:rounded-[2px] before:bg-fg after:absolute after:right-0 after:top-0 after:size-2.5 after:rounded-[2px] after:bg-fg" />
          <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[0.06em] text-fg-dim">20 {unit}</p>
        </div>
      </div>
    </section>
  );
}

function Cell({
  cell,
  nat = false,
  className,
  children,
}: {
  cell: Domain;
  nat?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      data-cell={cell}
      data-theme={nat ? "nat" : undefined}
      className={cn(
        "relative col-span-12 flex flex-col overflow-hidden rounded-[14px] border p-[clamp(22px,2.4vw,34px)] lg:min-h-[300px]",
        nat ? "border-bg bg-bg text-fg" : "border-line bg-bg-2",
        className,
      )}
    >
      {children}
    </article>
  );
}

function CellKicker({ domain, children }: { domain: Domain; children: ReactNode }) {
  return (
    <p
      data-domain={domain}
      className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-domain"
    >
      <i aria-hidden="true" className="inline-block size-2 flex-none rounded-full bg-domain" />
      {children}
    </p>
  );
}

function CellHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-display mt-3.5 max-w-[12ch] text-[clamp(30px,2.8vw,42px)] leading-[0.92]!">{children}</h3>
  );
}

/** Last night's mind-check as three five-step scales (reference B `.sind-scales`). */
function MindScales() {
  const t = useTranslations("Marketing.kalk.systems.mind");
  const m = useTranslations("Marketing.kalk.screens.mindChecked");
  const scales = MIND_SCALES.map((key) => ({ key, label: t(key), value: m(`${key}Value`) }));

  return (
    <div
      data-domain="mind"
      role="img"
      aria-label={scales.map((sc) => `${sc.label} ${sc.value}`).join(", ")}
      className="mt-auto grid gap-2.5 pt-[26px]"
    >
      {scales.map((sc) => {
        const filled = Number.parseInt(sc.value, 10);
        return (
          <div
            key={sc.key}
            aria-hidden="true"
            className="grid grid-cols-[64px_repeat(5,minmax(0,1fr))_34px] items-center gap-1.5 font-mono text-[11px] md:grid-cols-[90px_repeat(5,minmax(0,1fr))_44px] md:text-[12px]"
          >
            <span>{sc.label}</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <i
                key={n}
                className={cn(
                  "h-[26px] rounded-[10px] border",
                  n <= filled ? "border-domain bg-domain" : "border-line-bright",
                )}
              />
            ))}
            <em className="text-right not-italic text-fg-dim">{sc.value}</em>
          </div>
        );
      })}
    </div>
  );
}
