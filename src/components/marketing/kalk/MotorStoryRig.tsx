"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MOTOR_STEPS, activeStepFrom, hiddenStates, type MotorStepKey } from "@/lib/marketing/kalk/motor-story";

/**
 * Sticky phone beside the morning report (reference A `.rig`). The four
 * phone states arrive as children from the server; this island only
 * decides which one is active.
 *
 * An IntersectionObserver watches the report lines in the same
 * `[data-motor-story]` block; the line nearest the viewport centre wins
 * (`activeStepFrom`). No scroll listeners. Without JS the rig stays on
 * the decision. The active key is mirrored onto the block so the lines
 * can dim themselves with CSS. Below 1024 px the rig is `display:
 * contents`, so its states stack between the lines. `--rig-s`
 * (globals.css) shrinks the rig on short viewports.
 */
export default function MotorStoryRig({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<MotorStepKey>("decision");

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>("[data-motor-story]");
    if (!root || typeof IntersectionObserver === "undefined") return;

    const distances = new Map<MotorStepKey, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.step as MotorStepKey;
          if (!entry.isIntersecting) {
            distances.delete(key);
            continue;
          }
          const box = entry.boundingClientRect;
          const band = entry.rootBounds;
          const centre = band ? band.top + band.height / 2 : window.innerHeight / 2;
          distances.set(key, Math.abs(box.top + box.height / 2 - centre));
        }
        const next = activeStepFrom(
          [...distances].map(([key, distanceToCentre]) => ({ key, distanceToCentre })),
        );
        root.dataset.active = next;
        setActive(next);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    root.querySelectorAll<HTMLElement>("article[data-step]").forEach((line) => io.observe(line));

    return () => {
      io.disconnect();
      delete root.dataset.active;
    };
  }, []);

  // On desktop only the active phone is visible, so hide the others
  // from screen readers. Below 1024 px every phone is shown.
  useEffect(() => {
    const rig = ref.current;
    if (!rig || typeof window.matchMedia !== "function") return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const states = rig.querySelectorAll<HTMLElement>("[data-state]");
    const apply = () => {
      const hidden = hiddenStates(active, desktop.matches);
      states.forEach((state) => {
        if (hidden.includes(state.dataset.state as MotorStepKey)) state.setAttribute("aria-hidden", "true");
        else state.removeAttribute("aria-hidden");
      });
    };
    apply();
    desktop.addEventListener("change", apply);
    return () => {
      desktop.removeEventListener("change", apply);
      states.forEach((state) => state.removeAttribute("aria-hidden"));
    };
  }, [active]);

  return (
    <div
      ref={ref}
      data-active={active}
      className="group/rig contents lg:sticky lg:top-[max(1rem,calc(50svh_-_312px*var(--rig-s)))] lg:mt-[calc(41vh_-_312px*var(--rig-s))] lg:block lg:aspect-[9/19.5] lg:w-[calc(288px*var(--rig-s))] lg:self-start lg:before:absolute lg:before:inset-0 lg:before:rounded-[16%/7.38%] lg:before:bg-fg"
    >
      {children}
      <div aria-hidden="true" className="absolute inset-x-0 top-[calc(100%+46px)] hidden justify-center gap-1.5 lg:flex">
        {MOTOR_STEPS.map((step) => (
          <i
            key={step.key}
            className={`h-0.5 w-[22px] transition-colors duration-300 motion-reduce:transition-none ${
              step.key === active ? "bg-signal" : "bg-line-strong"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
