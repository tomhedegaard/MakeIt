import { useTranslations } from "next-intl";
import NightCurveReveal from "./NightCurveReveal";

/** Reference band the member's own HRV sits against, same two lines as before. */
const BAND = [
  { ms: "68", y: 47.1 },
  { ms: "54", y: 73.9 },
] as const;

/**
 * One continuous night curve (replaces the old two-path strip: a
 * sleep-stage line plus a separate HRV line). It starts at 23:40,
 * dips through the small hours and settles by 06:45 — a single
 * readiness read rather than two stacked metrics.
 */
const NIGHT_CURVE_PATH =
  "M40 67.6L50.8 66.5L61.6 66.5L72.5 66.7L83.3 64.1L94.1 60.7L104.9 62.6L115.8 61.6L126.6 63.1L137.4 62.5" +
  "L148.2 63.2L159.1 65.1L169.9 66.6L180.7 67.4L191.5 63.6L202.4 63.3L213.2 64.8L224 61.7L234.8 58.7L245.6 59.9" +
  "L256.5 62.8L267.3 64.7L278.1 66.7L288.9 66.6L299.8 68.2L310.6 68.4L321.4 68.4L332.2 66.5L343.1 63L353.9 61.3" +
  "L364.7 62.1L375.5 62.7L386.4 62.5L397.2 63.2L408 64.1L418.8 66.4L429.6 66.8L440.5 62.8L451.3 65L462.1 64.4" +
  "L472.9 63L483.8 60.8L494.6 63.4L505.4 65.2L516.2 66.8L527.1 67.3L537.9 67.6L548.7 64.8L559.5 63.5L570.4 62.6" +
  "L581.2 67.5L592 71.3L602.8 70L613.6 68.1L624.5 69.5L635.3 70.1L646.1 74.4L656.9 75.4L667.8 72.9L678.6 71.8" +
  "L689.4 71.1L700.2 69.9L711.1 73.9L721.9 77.9L732.7 80.8L743.5 80.9L754.4 80.1L765.2 78.1L776 78.1L786.8 78.8" +
  "L797.6 85.4L850 96L905 108L960 120";

/** The three aflæsninger (readings) the copy calls out, each on its own domain. */
const READINGS = [
  { key: "t0", cx: 40, cy: 67.6, domain: "mind" },
  { key: "t2", cx: 797.6, cy: 85.4, domain: "heart" },
  { key: "t3", cx: 960, cy: 120, domain: "body" },
] as const;

const AXIS = [
  { key: "t0", left: "4%", shift: "" },
  { key: "t1", left: "36.5%", shift: "-translate-x-1/2 max-sm:hidden" },
  { key: "t2", left: "79.76%", shift: "-translate-x-full sm:-translate-x-1/2 text-fg" },
  { key: "t3", left: "96%", shift: "-translate-x-full" },
] as const;

/**
 * Last night as one curve (reference C `.strip`, redrawn). Server
 * component: the only client code is NightCurveReveal, a tiny island
 * that flips `data-in-view` on this figure so the CSS in globals.css
 * can draw `.night-curve__path` in. Reduced motion shows the finished
 * curve immediately (globals.css).
 */
export default function NightCurve() {
  const t = useTranslations("Marketing.kalk.engine");
  const n = (k: string) => t(`night.${k}`);

  return (
    <figure
      data-night-curve
      className="m-0 rounded-[22px] border border-line bg-bg-2 px-[18px] pb-[22px] pt-5 sm:px-7 sm:pb-7 sm:pt-[26px]"
    >
      <div className="mb-[18px] flex justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.08em] text-fg-dim">
        <span>
          {n("label")} · {n("t0")} → {n("t3")}
        </span>
        <span>{n("sample")}</span>
      </div>

      <svg viewBox="0 0 1000 214" aria-hidden="true" className="block h-auto w-full overflow-visible">
        {BAND.map((line) => (
          <g key={line.ms}>
            <line x1="40" x2="960" y1={line.y} y2={line.y} strokeDasharray="3 5" className="stroke-line-bright" />
            <text x="964" y={line.y} dy="3.5" fontSize="10" className="fill-fg-dim font-mono">
              {line.ms}
            </text>
          </g>
        ))}
        <line x1="40" x2="960" y1="206" y2="206" className="stroke-line-strong" />

        <path
          d={NIGHT_CURVE_PATH}
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeOpacity=".8"
          className="night-curve__path stroke-fg-dim"
        />

        {READINGS.map((reading) => (
          <g key={reading.key} data-domain={reading.domain}>
            <circle cx={reading.cx} cy={reading.cy} r="5" strokeWidth="2" className="fill-bg-2 stroke-domain" />
          </g>
        ))}

        <text x="797.6" y="85.4" dx="-12" dy="22" fontSize="13" textAnchor="end" className="fill-fg font-mono">
          {t("steps.hrv.value")} {t("steps.hrv.unit")}
        </text>
      </svg>

      <div aria-hidden="true" className="relative mt-2.5 h-5 font-mono text-[11px] text-fg-dim">
        {AXIS.map((tick) => (
          <span key={tick.key} style={{ left: tick.left }} className={`absolute top-0 whitespace-nowrap ${tick.shift}`}>
            {n(tick.key)}
          </span>
        ))}
      </div>

      <div aria-hidden="true" className="mt-[18px] flex flex-wrap gap-x-[18px] gap-y-2 font-mono text-[11px] tracking-[0.06em] text-fg-dim">
        <span data-domain="mind" className="inline-flex items-center gap-2">
          <i className="size-1.5 rounded-full bg-domain" />
          {n("legendSleep")}
        </span>
        <span data-domain="heart" className="inline-flex items-center gap-2">
          <i className="size-1.5 rounded-full bg-domain" />
          {n("legendHrv")}
        </span>
        <span className="inline-flex items-center gap-2">
          <i className="h-0.5 w-4 bg-[repeating-linear-gradient(90deg,var(--line-bright)_0_3px,transparent_3px_6px)]" />
          {n("legendBand")}
        </span>
      </div>

      <NightCurveReveal />
    </figure>
  );
}
