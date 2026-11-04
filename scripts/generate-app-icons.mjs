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

/* The 2× PNG of the mark for mail headers, which cannot show SVG. */
const BRAND = new URL("../public/brand/", import.meta.url).pathname;
await mkdir(BRAND, { recursive: true });
await sharp(
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${BOX.x} ${BOX.y} ${BOX.w} ${BOX.h}" width="56" height="48"><g fill="${BG}"><path d="${OUTER}"/><path d="${INNER}"/></g></svg>`),
)
  .png()
  .toFile(`${BRAND}a-mark.png`);
console.log("✓ public/brand/a-mark.png (56×48)");

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
