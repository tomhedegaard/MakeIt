"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Custom cursor — a 6px filled dot + a 32px outlined ring that
 * follows the mouse with two different spring stiffnesses, so the
 * dot tracks tightly while the ring lags slightly behind. The ring
 * grows to 56px on hover targets (any anchor, button, [role=button],
 * or [data-cursor]).
 *
 * mix-blend-mode: difference inverts the cursor color against
 * whatever's underneath, so it stays legible on dark sections,
 * light sections, images, and gradients without per-section logic.
 *
 * Touch / coarse-pointer devices keep the native cursor (or none).
 * The native cursor is hidden via the .cursor-custom class on
 * <html> applied below — only when the device passes the
 * fine-pointer check, so taps still feel right on mobile.
 */
export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  // Spring-physics for the two layers. Tight follower for the dot,
  // looser one for the ring so the lag reads as a tail.
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const dotX = useSpring(x, { stiffness: 900, damping: 60, mass: 0.2 });
  const dotY = useSpring(y, { stiffness: 900, damping: 60, mass: 0.2 });
  const ringX = useSpring(x, { stiffness: 220, damping: 26, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 220, damping: 26, mass: 0.5 });

  useEffect(() => {
    // Gate on fine-pointer + hover capability. Excludes touch
    // devices (phones/tablets) and assistive setups where a custom
    // cursor would feel hostile.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setEnabled(fine.matches);
    apply();
    fine.addEventListener("change", apply);
    return () => fine.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.documentElement.classList.add("cursor-custom");

    function onMove(e: MouseEvent) {
      x.set(e.clientX);
      y.set(e.clientY);
    }

    // Walks up from the mousemove target to spot the nearest
    // hover-target. Cheaper than wiring listeners on every
    // anchor/button — but we still listen on the document so
    // hover state stays consistent even as the DOM mutates.
    function onMoveCheckHover(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isHoverTarget = !!target.closest(
        "a, button, [role=button], input, textarea, select, label, summary, [data-cursor]"
      );
      setHovering(isHoverTarget);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousemove", onMoveCheckHover);

    return () => {
      document.documentElement.classList.remove("cursor-custom");
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousemove", onMoveCheckHover);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* Outer ring — grows on hover, follows with lag */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[70] rounded-full mix-blend-difference"
        style={{
          x: ringX,
          y: ringY,
          width: hovering ? 56 : 32,
          height: hovering ? 56 : 32,
          marginLeft: hovering ? -28 : -16,
          marginTop: hovering ? -28 : -16,
          border: "1.5px solid #fff",
          backgroundColor: hovering ? "rgba(255,255,255,0.08)" : "transparent",
          transition: "width 200ms ease, height 200ms ease, margin 200ms ease, background-color 200ms ease",
        }}
      />
      {/* Inner dot — tight follow */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 z-[71] rounded-full mix-blend-difference"
        style={{
          x: dotX,
          y: dotY,
          width: 6,
          height: 6,
          marginLeft: -3,
          marginTop: -3,
          backgroundColor: "#fff",
        }}
      />
    </>
  );
}
