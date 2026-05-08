"use client";

import { useEffect, useRef } from "react";

/**
 * Mouse-tracked radial spotlight that drifts behind whatever sits next
 * to it. Renders nothing on touch devices (no hover capability) so it
 * doesn't waste paint cycles or fight scroll. The gradient is positioned
 * via CSS custom properties on the element so we never re-render React.
 */
export default function Spotlight({
  className,
  size = 520,
  intensity = 0.08,
}: {
  className?: string;
  /** spotlight diameter in px */
  size?: number;
  /** alpha multiplier for the cream highlight, 0–1 */
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Skip on devices that don't truly hover — touch-only screens fire
    // synthetic mousemove events that look jittery.
    const canHover = window.matchMedia("(hover: hover)").matches;
    if (!canHover) return;

    let raf = 0;
    let pendingX = 0;
    let pendingY = 0;

    function onMove(e: MouseEvent) {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      pendingX = e.clientX - rect.left;
      pendingY = e.clientY - rect.top;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el!.style.setProperty("--sx", `${pendingX}px`);
        el!.style.setProperty("--sy", `${pendingY}px`);
        el!.style.setProperty("--sopacity", "1");
      });
    }
    function onLeave() {
      if (!el) return;
      el.style.setProperty("--sopacity", "0");
    }

    const parent = el.parentElement;
    if (!parent) return;
    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        background: `radial-gradient(${size}px circle at var(--sx, 50%) var(--sy, 50%), rgba(245,242,236,${intensity}), transparent 70%)`,
        opacity: "var(--sopacity, 0)",
        transition: "opacity 240ms ease-out",
      }}
    />
  );
}
