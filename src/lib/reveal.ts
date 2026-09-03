/**
 * Reveal-on-scroll is a progressive enhancement.
 *
 * Content with [data-reveal] must stay readable if JS never runs,
 * the observer misses a fast scroll, reduced-motion is on, or the
 * visitor lands on an anchor. JS may hide *off-screen* nodes only
 * after it has marked everything already in view (or in the hash
 * target) as visible.
 */

export const REVEAL_VISIBLE = "is-visible";
export const REVEAL_PENDING = "reveal-pending";

export function prefersReducedMotion(
  media: Pick<Window, "matchMedia"> | null | undefined,
): boolean {
  if (!media?.matchMedia) return false;
  try {
    return media.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function elementIsInViewport(
  rect: { top: number; bottom: number },
  viewportHeight: number,
  slackPx = 80,
): boolean {
  return rect.bottom > -slackPx && rect.top < viewportHeight + slackPx;
}

export function resolveHashId(hash: string): string | null {
  if (!hash || hash === "#") return null;
  try {
    const id = decodeURIComponent(hash.replace(/^#/, ""));
    return id || null;
  } catch {
    return null;
  }
}

export function collectRevealNodes(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
}

export function markVisible(el: Element): void {
  el.classList.add(REVEAL_VISIBLE);
  el.classList.remove(REVEAL_PENDING);
}

export function isInsideHashTarget(el: Element, hash: string): boolean {
  const id = resolveHashId(hash);
  if (!id) return false;
  if (el.id === id) return true;
  return el.closest(`#${cssEscape(id)}`) !== null;
}

function cssEscape(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

export type RevealInitOptions = {
  root: ParentNode;
  viewportHeight: number;
  hash: string;
  reducedMotion: boolean;
  hasIntersectionObserver: boolean;
  measure: (el: Element) => { top: number; bottom: number };
};

/**
 * Decide which reveal nodes may start hidden. Returns the nodes that
 * are allowed to animate in (off-screen, not in the hash target).
 */
export function planReveal(opts: RevealInitOptions): {
  showNow: HTMLElement[];
  mayAnimate: HTMLElement[];
} {
  const nodes = collectRevealNodes(opts.root);
  if (opts.reducedMotion || !opts.hasIntersectionObserver) {
    return { showNow: nodes, mayAnimate: [] };
  }

  const showNow: HTMLElement[] = [];
  const mayAnimate: HTMLElement[] = [];

  for (const el of nodes) {
    const inView = elementIsInViewport(opts.measure(el), opts.viewportHeight);
    if (inView || isInsideHashTarget(el, opts.hash)) {
      showNow.push(el);
    } else {
      mayAnimate.push(el);
    }
  }

  return { showNow, mayAnimate };
}

export function observerOptions(): IntersectionObserverInit {
  // Generous margins so a fast scroll still intersects. Threshold 0
  // fires as soon as one pixel crosses — we do not wait for 12%.
  return { threshold: 0, rootMargin: "20% 0px 20% 0px" };
}

export function initReveal(doc: Document, win: Window): () => void {
  const nodes = collectRevealNodes(doc);
  const reduced = prefersReducedMotion(win);
  const hasIO = "IntersectionObserver" in win;

  const { showNow, mayAnimate } = planReveal({
    root: doc,
    viewportHeight: win.innerHeight,
    hash: win.location.hash,
    reducedMotion: reduced,
    hasIntersectionObserver: hasIO,
    measure: (el) => el.getBoundingClientRect(),
  });

  showNow.forEach(markVisible);

  if (mayAnimate.length === 0) return () => {};

  mayAnimate.forEach((el) => el.classList.add(REVEAL_PENDING));

  const io = new win.IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      markVisible(entry.target);
      io.unobserve(entry.target);
    }
  }, observerOptions());

  mayAnimate.forEach((el) => io.observe(el));

  const revealIfVisible = () => {
    for (const el of mayAnimate) {
      if (el.classList.contains(REVEAL_VISIBLE)) continue;
      if (elementIsInViewport(el.getBoundingClientRect(), win.innerHeight)) {
        markVisible(el);
        io.unobserve(el);
      }
    }
  };

  const onHash = () => {
    const id = resolveHashId(win.location.hash);
    if (!id) return;
    const target = doc.getElementById(id);
    if (!target) return;
    if (target.hasAttribute("data-reveal")) markVisible(target);
    target.querySelectorAll("[data-reveal]").forEach(markVisible);
  };

  win.addEventListener("scroll", revealIfVisible, { passive: true });
  win.addEventListener("resize", revealIfVisible);
  win.addEventListener("hashchange", onHash);
  // Catch a layout pass that IntersectionObserver skipped (Lenis,
  // late images, mobile address-bar resize).
  const failsafe = win.setTimeout(() => {
    mayAnimate.forEach((el) => {
      if (!el.classList.contains(REVEAL_VISIBLE)) markVisible(el);
    });
  }, 2500);

  return () => {
    io.disconnect();
    win.removeEventListener("scroll", revealIfVisible);
    win.removeEventListener("resize", revealIfVisible);
    win.removeEventListener("hashchange", onHash);
    win.clearTimeout(failsafe);
  };
}
