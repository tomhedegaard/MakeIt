/**
 * Render MakeItFigure (the real component) to PNG stills for
 * docs/briefs/figure-v3b/. Teaching, heart-focus, food-focus.
 *
 *   node --import tsx scripts/capture-figure-v3b.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import MakeItFigureMod, { ALL_DOMAINS } from "../src/components/brand/MakeItFigure.tsx";

const MakeItFigure =
  typeof MakeItFigureMod === "function"
    ? MakeItFigureMod
    : MakeItFigureMod.default;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/briefs/figure-v3b");

const FRAMES = [
  { file: "teaching.png", domains: [...ALL_DOMAINS], caption: "A Teaching — all four, no green halo" },
  { file: "heart-focus.png", domains: ["heart"], caption: "C Fokus Hjerte — anatomical organ only" },
  { file: "food-focus.png", domains: ["food"], caption: "E Fokus Kost — J-stomach + 1px halo" },
];

const PAGE = (svg, caption) => `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  :root {
    --bg: #0A0A0B;
    --steel: #1A1D24;
    --fg-faint: #56554F;
    --heart: #F2545B;
    --food: #45C487;
    --body: #FF9C41;
    --mind: #5B9DF5;
  }
  html, body { margin: 0; background: var(--bg); }
  .wrap {
    width: 1100px;
    height: 2200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }
  .makeit-figure { height: 2000px; width: auto; overflow: visible; }
  .cap {
    margin-top: 28px;
    color: #A8A6A0;
    font: 18px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: 0.04em;
  }
</style>
</head>
<body>
  <div class="wrap">
    ${svg}
    <div class="cap">${caption}</div>
  </div>
</body>
</html>`;

mkdirSync(OUT, { recursive: true });
mkdirSync("/tmp/figure-v3b-stills", { recursive: true });

for (const frame of FRAMES) {
  const svg = renderToStaticMarkup(
    createElement(MakeItFigure, {
      highlightedDomains: frame.domains,
      ariaLabel: frame.caption,
      variant: "v3b",
    }),
  );
  const htmlPath = `/tmp/figure-v3b-stills/${frame.file.replace(".png", ".html")}`;
  const pngPath = join(OUT, frame.file);
  writeFileSync(htmlPath, PAGE(svg, frame.caption));

  const chrome = spawnSync(
    "google-chrome",
    [
      "--headless",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=/tmp/chrome-still-${frame.file}`,
      "--hide-scrollbars",
      "--window-size=1100,2200",
      "--virtual-time-budget=4000",
      `--screenshot=${pngPath}`,
      `file://${htmlPath}`,
    ],
    { timeout: 20000, encoding: "utf8" },
  );
  if (chrome.status !== 0 && chrome.status !== 124) {
    console.error(chrome.stderr);
    throw new Error(`chrome failed for ${frame.file} (status ${chrome.status})`);
  }
  console.log("wrote", pngPath);
}
