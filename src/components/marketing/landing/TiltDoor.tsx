"use client";

import { useRef, type ReactNode } from "react";

/**
 * A hero door that follows the mouse: the phone inside tilts a few
 * degrees toward the pointer and settles back when it leaves. Mouse only
 * (touch and keyboard get the plain link), and never with reduced motion
 * (`.door-phone` in globals.css ignores the variables then).
 */
export default function TiltDoor({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || !ref.current) return;
        const box = ref.current.getBoundingClientRect();
        const px = (e.clientX - box.left) / box.width - 0.5;
        const py = (e.clientY - box.top) / box.height - 0.5;
        ref.current.style.setProperty("--ry", `${(px * 10).toFixed(2)}deg`);
        ref.current.style.setProperty("--rx", `${(-py * 8).toFixed(2)}deg`);
      }}
      onPointerLeave={() => {
        ref.current?.style.setProperty("--ry", "0deg");
        ref.current?.style.setProperty("--rx", "0deg");
      }}
    >
      {children}
    </a>
  );
}
