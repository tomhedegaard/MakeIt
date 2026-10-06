"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * Fourteen sample nights of HRV in ms. Band 54 to 68 (the motor story's
 * band); the last three fall, as the HRV report line says.
 */
const NIGHTS = [61, 58, 63, 66, 60, 57, 64, 62, 59, 65, 61, 56, 52, 48] as const;
const BAND = { lo: 54, hi: 68 } as const;
const Y = { min: 40, max: 74 } as const;

/** Playback speed on arrival: one night per step. */
const NIGHT_MS = 110;

const W = 560;
const H = 180;
const x = (i: number) => (i / (NIGHTS.length - 1)) * W;
const y = (ms: number) => H - ((ms - Y.min) / (Y.max - Y.min)) * H;

export type HeartLiveLabels = {
  devicesLabel: string;
  devices: string[];
  appleNote: string;
  syncedFrom: string;
  unit: string;
  chartLabel: string;
  night: string;
  tonight: string;
  inBand: string;
  below: string;
  above: string;
  hint: string;
};

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

/**
 * Hjerte, interactive: pick a watch and the sync line follows it; move
 * across the nights (pointer, touch or arrow keys) and the big reading,
 * its place against your band and the chart marker follow. The chart is
 * a slider for assistive tech. Sample data, as on the rest of the page.
 *
 * On arrival (once, motion allowed) the line draws itself night by night
 * and the marker and the big reading ride along with it, landing on
 * tonight. Any touch or key stops the playback and hands over control.
 * Server and no-JS render the finished chart on tonight.
 */
export default function HeartLive({ labels }: { labels: HeartLiveLabels }) {
  const [device, setDevice] = useState(0);
  const [night, setNight] = useState(NIGHTS.length - 1);
  // "rest": finished chart. "armed": waiting off screen. "play": drawing.
  const [phase, setPhase] = useState<"rest" | "armed" | "play">("rest");
  const svgRef = useRef<SVGSVGElement>(null);
  const timer = useRef(0);
  const taken = useRef(false);

  // Mirror the chosen device onto the section, so the server-rendered
  // device stage and the phone's source field follow it in CSS.
  useEffect(() => {
    const section = svgRef.current?.closest<HTMLElement>("[data-device]");
    if (section) section.dataset.device = String(device);
  }, [device]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof IntersectionObserver === "undefined" || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;

    // Arm just before the chart scrolls into view (so the finished line
    // never flashes away in sight), play once most of it is visible.
    const arm = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        arm.disconnect();
        if (taken.current) return;
        setPhase("armed");
        setNight(0);
      },
      { rootMargin: "0px 0px 30% 0px" },
    );
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (taken.current) return;
        setPhase("play");
        let n = 0;
        timer.current = window.setInterval(() => {
          n += 1;
          setNight(n);
          if (n >= NIGHTS.length - 1) {
            window.clearInterval(timer.current);
            setPhase("rest");
          }
        }, NIGHT_MS);
      },
      { threshold: 0.6 },
    );
    arm.observe(svg);
    io.observe(svg);

    return () => {
      arm.disconnect();
      io.disconnect();
      window.clearInterval(timer.current);
    };
  }, []);

  /** The visitor takes over: stop the playback, show the whole line. */
  function takeOver() {
    taken.current = true;
    if (phase === "rest") return;
    window.clearInterval(timer.current);
    setPhase("rest");
  }

  const ms = NIGHTS[night];
  const status = ms < BAND.lo ? labels.below : ms > BAND.hi ? labels.above : labels.inBand;
  const last = night === NIGHTS.length - 1;
  const nightLabel = last ? labels.tonight : fill(labels.night, { n: night + 1 });

  function pick(e: PointerEvent<SVGSVGElement>) {
    takeOver();
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setNight(Math.round(ratio * (NIGHTS.length - 1)));
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    const step = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
    if (e.key === "Home") setNight(0);
    else if (e.key === "End") setNight(NIGHTS.length - 1);
    else if (step) setNight((n) => Math.min(NIGHTS.length - 1, Math.max(0, n + step)));
    else return;
    takeOver();
    e.preventDefault();
  }

  const path = NIGHTS.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  return (
    <div>
      <p className="text-[13px] text-fg-dim">{labels.devicesLabel}</p>
      <ul className="mt-3 flex flex-wrap gap-x-2 gap-y-2 border-y border-line py-4">
        {labels.devices.map((d, i) => (
          <li key={d}>
            <button
              type="button"
              aria-pressed={device === i}
              onClick={() => setDevice(i)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setDevice(i)}
              className={cn(
                "font-display cursor-pointer px-3 py-1.5 text-[clamp(24px,2.6vw,38px)] leading-none transition-colors duration-200 motion-reduce:transition-none",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                device === i ? "bg-fg text-bg" : "text-fg-dim hover:text-fg",
              )}
            >
              {d}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-micro text-fg-dim">{labels.appleNote}</p>

      <div className="mt-10">
        <p aria-live="polite" className="text-[13px] text-fg-dim">
          {fill(labels.syncedFrom, { device: labels.devices[device] })}
        </p>
        <p className="font-display mt-2 flex items-baseline gap-3 leading-[0.85] text-domain">
          <span className="numeric text-[clamp(96px,13vw,200px)] tracking-[-0.04em]">{ms}</span>
          <span className="text-[clamp(24px,2.4vw,36px)]">{labels.unit}</span>
        </p>
        <p className="mt-4 flex gap-3 text-[clamp(16px,1.3vw,19px)]">
          <span>{nightLabel}</span>
          <span className="text-fg-dim">·</span>
          <span className={ms < BAND.lo ? "text-domain" : undefined}>{status}</span>
        </p>

        <svg
          ref={svgRef}
          viewBox={`-8 -8 ${W + 16} ${H + 16}`}
          role="slider"
          tabIndex={0}
          aria-label={labels.chartLabel}
          aria-valuemin={1}
          aria-valuemax={NIGHTS.length}
          aria-valuenow={night + 1}
          aria-valuetext={`${nightLabel}, ${ms} ${labels.unit}, ${status}`}
          onPointerMove={(e) => (phase !== "play" || e.pointerType !== "mouse") && pick(e)}
          onPointerDown={pick}
          onKeyDown={onKey}
          className="mt-8 w-full max-w-[640px] cursor-crosshair touch-pan-y focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-fg"
        >
          <rect x={0} y={y(BAND.hi)} width={W} height={y(BAND.lo) - y(BAND.hi)} className="fill-domain-tint" />
          <line x1={0} x2={W} y1={y(BAND.lo)} y2={y(BAND.lo)} className="stroke-domain-line" strokeDasharray="4 4" />
          <line x1={0} x2={W} y1={y(BAND.hi)} y2={y(BAND.hi)} className="stroke-domain-line" strokeDasharray="4 4" />
          <path
            d={path}
            fill="none"
            pathLength={1}
            className="stroke-domain"
            style={{
              strokeDasharray: 1,
              strokeDashoffset: phase === "armed" ? 1 : 0,
              transition: phase === "play" ? `stroke-dashoffset ${NIGHT_MS * (NIGHTS.length - 1)}ms linear` : undefined,
            }}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {NIGHTS.map((v, i) => (
            <circle
              key={i}
              cx={x(i)}
              cy={y(v)}
              r={i === night ? 7 : 3}
              className={cn(i === night ? "fill-domain" : "fill-fg-dim", phase !== "rest" && i > night && "opacity-0")}
            />
          ))}
          <line x1={x(night)} x2={x(night)} y1={0} y2={H} className="stroke-fg-dim" strokeWidth={1} />
        </svg>
        <p className="mt-2 text-micro text-fg-dim">{labels.hint}</p>
      </div>
    </div>
  );
}
