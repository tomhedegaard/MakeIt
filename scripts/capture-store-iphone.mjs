#!/usr/bin/env node
/**
 * Capture the App Store 6.7" iPhone set (1290×2796) in demo mode.
 *
 * Prerequisites: app listening on http://localhost:3002 with no
 * `.env.local` / Supabase (cookie invite MUNK-01). Chromium via
 * `npx playwright install chromium`.
 *
 *   node scripts/capture-store-iphone.mjs
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

async function dismissChrome(page) {
  await page.addInitScript(() => {
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

  // --- 01 login (invite field filled, no error) ---
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
    await waitSettled(page);
    const field = page.locator('input[name="code"]');
    await field.waitFor({ state: "visible", timeout: 15_000 });
    await field.fill("MUNK-01");
    await page.waitForTimeout(200);
    results.push(await shot(page, "01-login.png", consoleErrors));
  } catch (err) {
    skipped.push({ file: "01-login.png", reason: String(err) });
    console.warn("  ✗ 01-login.png", err.message);
  }

  // --- login + land ---
  try {
    await page.locator('form button[type="submit"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    await waitSettled(page);
  } catch (err) {
    console.error("Login submit failed:", err.message);
    await browser.close();
    process.exit(1);
  }

  // --- 02 today ---
  try {
    await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitSettled(page);
    results.push(await shot(page, "02-today.png", consoleErrors));
  } catch (err) {
    skipped.push({ file: "02-today.png", reason: String(err) });
    console.warn("  ✗ 02-today.png", err.message);
  }

  // --- 03 body / træning ---
  try {
    await page.goto(`${BASE}/coaching`, { waitUntil: "domcontentloaded" });
    await waitSettled(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    results.push(await shot(page, "03-body.png", consoleErrors));
  } catch (err) {
    skipped.push({ file: "03-body.png", reason: String(err) });
    console.warn("  ✗ 03-body.png", err.message);
  }

  // --- 04 food / kost ---
  try {
    await page.goto(`${BASE}/nutrition`, { waitUntil: "domcontentloaded" });
    await waitSettled(page);
    const planAnchor = page.locator('[id^="day-"]').first();
    if (await planAnchor.count()) {
      await planAnchor.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
    }
    results.push(await shot(page, "04-food.png", consoleErrors));
  } catch (err) {
    skipped.push({ file: "04-food.png", reason: String(err) });
    console.warn("  ✗ 04-food.png", err.message);
  }

  // --- 05 heart / HRV ---
  try {
    await page.goto(`${BASE}/hrv`, { waitUntil: "domcontentloaded" });
    await waitSettled(page);
    results.push(await shot(page, "05-heart.png", consoleErrors));
  } catch (err) {
    skipped.push({ file: "05-heart.png", reason: String(err) });
    console.warn("  ✗ 05-heart.png", err.message);
  }

  // --- 06 mind ---
  try {
    await page.goto(`${BASE}/mind`, { waitUntil: "domcontentloaded" });
    await waitSettled(page);
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
    results.push(await shot(page, "06-mind.png", consoleErrors));
  } catch (err) {
    skipped.push({ file: "06-mind.png", reason: String(err) });
    console.warn("  ✗ 06-mind.png", err.message);
  }

  await writeFile(
    "/tmp/store-iphone-capture-log.json",
    JSON.stringify(
      {
        base: BASE,
        captured: results.map((r) => r.path),
        skipped,
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
  if (results.length < 1) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
