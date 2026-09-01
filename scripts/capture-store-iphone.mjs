#!/usr/bin/env node
/**
 * Capture the App Store 6.7" iPhone set (1290×2796) in demo mode.
 *
 * Prerequisites: app listening on http://localhost:3002 with no
 * `.env.local` / Supabase (cookie invite MUNK-01). Chromium via
 * `npx playwright install chromium`.
 *
 *   node scripts/capture-store-iphone.mjs
 *
 * Public set is Today + four domains. Login is omitted: demo `/login`
 * always shows test codes and an "ingen backend" footer — not a
 * clean store frame. See docs/store/iphone-6.7/README.md.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs/store/iphone-6.7");
const BASE = process.env.STORE_CAPTURE_BASE ?? "http://127.0.0.1:3002";

const VIEWPORT = { width: 430, height: 932 };
const SCALE = 3;
const EXPORT = { w: 1290, h: 2796 };

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

const FORBIDDEN = [
  /køb/i,
  /stripe/i,
  /\[xx\]/i,
  /\[yy\]/i,
  /\[zz\]/i,
  /\b\d+\s*kr\b/i,
  /kr\s*\/\s*md/i,
  /test-koder/i,
  /test codes/i,
  /ingen backend/i,
  /no backend/i,
  /demo mode/i,
];

const FRAMES = [
  {
    file: "01-today.png",
    path: "/dashboard",
    requireFigure: true,
  },
  {
    file: "02-body.png",
    path: "/coaching",
  },
  {
    file: "03-food.png",
    path: "/nutrition",
    scroll: '[id^="day-"]',
  },
  {
    file: "04-heart.png",
    path: "/hrv",
  },
  {
    file: "05-mind.png",
    path: "/mind",
    mind: true,
  },
];

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    console.error(
      "Playwright is not installed. Run: npm i -D playwright && npx playwright install chromium",
    );
    process.exit(1);
  }
}

async function dismissChrome(context) {
  await context.addInitScript(() => {
    try {
      localStorage.setItem("mi_cookie_consent_v1", "essential");
      localStorage.setItem("mi_tour_done_v1", "1");
      localStorage.setItem("mi_mind_tour_done_v1", "1");
      localStorage.setItem("mi_install_hint_dismissed", "1");
    } catch {
      /* ignore */
    }
  });
}

async function waitSettled(page) {
  await page.waitForLoadState("domcontentloaded");
  try {
    await page.waitForLoadState("networkidle", { timeout: 12_000 });
  } catch {
    /* some pages keep a long-poll; ignore */
  }
  await page.waitForTimeout(600);
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });
}

async function visibleForbidden(page) {
  return page.evaluate((patterns) => {
    const compiled = patterns.map((p) => new RegExp(p.source, p.flags));
    const hits = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const text = (walker.currentNode.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) continue;
      const el = walker.currentNode.parentElement;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight || r.width === 0 || r.height === 0) {
        continue;
      }
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") {
        continue;
      }
      for (const n of compiled) {
        if (n.test(text)) hits.push(text.slice(0, 80));
      }
    }
    return hits;
  }, FORBIDDEN.map((r) => ({ source: r.source, flags: r.flags })));
}

async function shot(page, name, errors) {
  const path = join(outDir, name);
  await page.screenshot({
    path,
    type: "png",
    fullPage: false,
    animations: "disabled",
    caret: "hide",
    scale: "device",
  });
  const { readFile } = await import("node:fs/promises");
  const png = await readFile(path);
  const w = png.readUInt32BE(16);
  const h = png.readUInt32BE(20);
  if (w !== EXPORT.w || h !== EXPORT.h) {
    throw new Error(`${name} is ${w}×${h}, expected ${EXPORT.w}×${EXPORT.h}`);
  }
  const forbidden = await visibleForbidden(page);
  if (forbidden.length) {
    throw new Error(`${name} shows forbidden store copy: ${forbidden.join(" | ")}`);
  }
  const pageErrors = errors.filter((e) => e.url === page.url() || e.when === "global");
  console.log(`  ✓ ${name}  ${w}×${h}  console-errors=${pageErrors.length}`);
  return { path, errors: pageErrors };
}

async function acceptMindDisclaimer(page) {
  const accept = page.getByRole("button", { name: /Jeg har forstået/i });
  if (await accept.count()) {
    await accept.click();
    await page.waitForURL(/\/mind\/(check|today)/, { timeout: 15_000 });
    await waitSettled(page);
  }
}

async function main() {
  const { chromium } = loadPlaywright();
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--hide-scrollbars"],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    userAgent: IPHONE_UA,
    locale: "da-DK",
    colorScheme: "dark",
    reducedMotion: "reduce",
  });
  await dismissChrome(context);

  const origin = new URL(BASE).origin;
  await context.addCookies([
    {
      name: "mi_session",
      value: "MUNK-01",
      url: origin,
    },
    {
      name: "mi_mind_disclaimer_ack",
      value: "1",
      url: origin,
    },
  ]);

  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => {
    consoleErrors.push({ when: "global", url: page.url(), text: String(err) });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ when: "global", url: page.url(), text: msg.text() });
    }
  });

  const results = [];
  const skipped = [];

  for (const frame of FRAMES) {
    try {
      await page.goto(`${BASE}${frame.path}`, { waitUntil: "domcontentloaded" });
      await waitSettled(page);
      await page.evaluate(() => window.scrollTo(0, 0));

      if (frame.mind) {
        await acceptMindDisclaimer(page);
        if (!/\/mind\/(check|today)/.test(page.url())) {
          await page.goto(`${BASE}/mind/check`, { waitUntil: "domcontentloaded" });
          await waitSettled(page);
          await acceptMindDisclaimer(page);
        }
        const graph = page.locator('svg[aria-label*="Mental graf"]');
        if (await graph.count()) {
          await graph.evaluate((el) => {
            el.scrollIntoView({ block: "center", behavior: "instant" });
          });
          await page.waitForTimeout(250);
        }
      }

      if (frame.scroll) {
        const target = page.locator(frame.scroll).first();
        if (await target.count()) {
          await target.scrollIntoViewIfNeeded();
          await page.waitForTimeout(250);
        }
      }

      if (frame.requireFigure) {
        const figure = page.locator("svg.makeit-figure");
        await figure.waitFor({ state: "visible", timeout: 10_000 });
      }

      results.push(await shot(page, frame.file, consoleErrors));
    } catch (err) {
      skipped.push({ file: frame.file, reason: String(err) });
      console.warn(`  ✗ ${frame.file}`, err.message);
    }
  }

  await writeFile(
    "/tmp/store-iphone-capture-log.json",
    JSON.stringify(
      {
        base: BASE,
        captured: results.map((r) => r.path),
        skipped,
        omitted: [
          {
            file: "login.png",
            reason:
              "Demo /login always shows test codes (MUNK-01 · …) and the “Demo mode · ingen backend tilkoblet” footer. Not a clean store frame.",
          },
        ],
        consoleErrors,
      },
      null,
      2,
    ),
  );

  await browser.close();

  if (skipped.length) {
    console.log("\nSkipped:", skipped);
  }
  const uniqueErrs = [...new Set(consoleErrors.map((e) => e.text))];
  console.log(`\nConsole errors seen: ${uniqueErrs.length}`);
  for (const e of uniqueErrs) console.log("  -", e);
  if (results.length < FRAMES.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
