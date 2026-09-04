"use client";

import { useEffect } from "react";

export default function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));

    // Enable hide-until-visible only after the first observer flush so
    // in-viewport nodes (hero stats, first sections) stay visible.
    const enable = requestAnimationFrame(() => {
      document.documentElement.classList.add("reveal-js");
    });

    return () => {
      cancelAnimationFrame(enable);
      document.documentElement.classList.remove("reveal-js");
      io.disconnect();
    };
  }, []);
  return null;
}
