"use client";

import { useEffect, useRef } from "react";

/**
 * Marks the chapter the visitor is reading in the landing nav (same
 * shape as NightCurveReveal: a hidden span that finds its block and
 * writes to it). It watches every `main section[id]`; the one crossing
 * the middle of the viewport sets `aria-current="location"` on the nav
 * links that point at it, and a section without a link (hero, motor,
 * access) clears the mark. Without JS no link is marked.
 */
export default function NavSpy() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const nav = ref.current?.closest<HTMLElement>("nav");
    if (!nav || typeof IntersectionObserver === "undefined") return;
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));

    const mark = (id: string | null) => {
      for (const a of links) {
        if (id && a.getAttribute("href") === `#${id}`) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((e) => e.isIntersecting);
        if (hit) mark(hit.target.id);
      },
      { rootMargin: "-49% 0px -49% 0px" },
    );
    document.querySelectorAll<HTMLElement>("main section[id]").forEach((s) => io.observe(s));

    return () => {
      io.disconnect();
      mark(null);
    };
  }, []);

  return <span ref={ref} hidden />;
}
