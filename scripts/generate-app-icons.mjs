/**
 * Generates the PWA/app icon suite from the MakeIt A (same paths as
 * src/components/brand/MakeItMark.tsx) on Nord ink. The icon is the
 * one place the sender's mark stands at full size (docs/BRAND_MARK.md).
 *
 * Two layouts:
 *  - standard: mark at ~62% of the tile (any-purpose icons, apple-touch)
 *  - maskable: mark at ~47% so it survives Android's circular mask
 *    (safe zone = inner 80% circle)
 *
 * Run: node scripts/generate-app-icons.mjs
 * Outputs to public/icons/. Re-run whenever the logo changes.
 */
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const BG = "#111111";
const FG = "#FFFFFF";

/** The A's two chevrons in the file's units; its box is x 54–533, y 45–444 (479 × 399). */
const OUTER =
  "M499.4 386.8L419.9 254.2 294.6 45h-1.9L145.3 291.3l-11.4 19.4L54.4 443.6h64.3l42.4-70.8 79.4-132.8 52.5-87.7h1.9l83.3 139 11.5 19.2 79.5 132.7h64.2z";
const INNER = "M293.7 197.4L146.3 443.7h64.4l83.1-139h1.9l83.3 139h64.2L295.6 197.4z";
const BOX = { x: 54, y: 45, w: 479, h: 399 };

/** The A scaled to `markScale` of the tile's width and centered on a square canvas. */
function markGroup(canvas, markScale) {
  const s = (canvas * markScale) / BOX.w;
  const ox = (canvas - BOX.w * s) / 2 - BOX.x * s;
  const oy = (canvas - BOX.h * s) / 2 - BOX.y * s;
  return `<g transform="translate(${ox} ${oy}) scale(${s})" fill="${FG}"><path d="${OUTER}"/><path d="${INNER}"/></g>`;
}

function iconSvg(markScale) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BG}"/>
  ${markGroup(1024, markScale)}
</svg>`;
}

const standard = Buffer.from(iconSvg(0.6));
const maskable = Buffer.from(iconSvg(0.46));

const OUT = new URL("../public/icons/", import.meta.url).pathname;
await mkdir(OUT, { recursive: true });

const jobs = [
  { src: standard, size: 192, file: "icon-192.png" },
  { src: standard, size: 512, file: "icon-512.png" },
  { src: maskable, size: 192, file: "icon-maskable-192.png" },
  { src: maskable, size: 512, file: "icon-maskable-512.png" },
  { src: standard, size: 180, file: "apple-touch-icon.png" },
  { src: standard, size: 32, file: "favicon-32.png" },
];

for (const { src, size, file } of jobs) {
  await sharp(src).resize(size, size).png().toFile(`${OUT}${file}`);
  console.log(`✓ public/icons/${file} (${size}×${size})`);
}

/* ---------------------------------------------------------------- *
 * Native shell sources (assets/ → @capacitor/assets generate)
 * Icon 1024 + splash 2732 med mærket lille og centreret — splash
 * skal føles som et blink af brandet, ikke en plakat.
 * ---------------------------------------------------------------- */
const ASSETS = new URL("../assets/", import.meta.url).pathname;
await mkdir(ASSETS, { recursive: true });

function splashSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${BG}"/>
  ${markGroup(2732, 0.1)}
</svg>`);
}

/*
 * The 2× PNG of the MAKEIT wordmark for mail headers, which cannot show
 * SVG: "HQ by MAKEIT" (docs/BRAND_MARK.md). Same paths as MakeItWordmark
 * in components/brand/MakeItMark.tsx; MAKE in ink, IT in the dim grey.
 */
const WORD_MAKE =
  "M114.7 0.1L115.1 120.1L91.5 120.2L91.4 69.2L57.8 118.3L57.6 118.3L23.7 69.4L23.9 120.4L0.3 120.5L0 0.4L1.3 0.4L57.6 77.7L113.4 0.1ZM258.2 102.8L258.2 102.8L234.2 62.9L234.1 62.9L196.2 0L195.6 0L151.4 74.3L151.5 74.3L148 80.2L148 80.2L124.1 120.3L143.5 120.2L156.2 98.9L156.2 98.9L180.1 58.8L180 58.8L195.8 32.3L196.3 32.3L221.5 74.1L221.5 74.1L225 79.9L225 79.9L249.1 119.9L268.4 119.8ZM196.1 45.9L151.9 120.3L171.2 120.2L196.2 78.3L196.8 78.3L222 120.1L241.3 120L196.6 45.9ZM334 118.6L298.3 67.4L298.4 118.7L275 118.7L274.6 1.6L298.1 1.6L298.3 52.2L331 1.5L358.2 1.4L320.8 58.8L362.7 118.5ZM397.1 24.5L397.2 47.4L437.6 47.2L437.7 70.7L397.3 70.8L397.3 95L444.4 94.9L444.5 118.3L373.9 118.5L373.5 1.4L444.2 1.2L444.2 24.3Z";
const WORD_IT =
  "M461.4 1.1L485 1.1L485.3 118.2L461.8 118.2ZM579.5 24.1L550.7 24.2L551 118L527.4 118.1L527.1 24.3L498.3 24.3L498.2 1L579.4 0.8Z";
const BRAND = new URL("../public/brand/", import.meta.url).pathname;
await mkdir(BRAND, { recursive: true });
await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 121" width="96" height="20"><path fill="${BG}" d="${WORD_MAKE}"/><path fill="#696964" d="${WORD_IT}"/></svg>`),
)
  .png()
  .toFile(`${BRAND}makeit-wordmark.png`);
console.log("✓ public/brand/makeit-wordmark.png (96×20)");

const nativeJobs = [
  { src: standard, size: 1024, file: "icon-only.png" },
  { src: maskable, size: 1024, file: "icon-foreground.png" },
  { src: splashSvg(), size: 2732, file: "splash.png" },
  { src: splashSvg(), size: 2732, file: "splash-dark.png" },
];

await sharp({
  create: { width: 1024, height: 1024, channels: 4, background: BG },
})
  .png()
  .toFile(`${ASSETS}icon-background.png`);
console.log("✓ assets/icon-background.png (1024×1024)");

for (const { src, size, file } of nativeJobs) {
  await sharp(src).resize(size, size).png().toFile(`${ASSETS}${file}`);
  console.log(`✓ assets/${file} (${size}×${size})`);
}
