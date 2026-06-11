/**
 * Generates the PWA/app icon suite from the MakeIt logo mark
 * (same paths as src/components/Logo.tsx, mark variant) on the
 * brand background #0A0A0B.
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

const BG = "#0A0A0B";
const FG = "#F5F2EC";

/** The 32×32 logo mark, scaled and centered on a 1024 canvas. */
function iconSvg(markScale) {
  const s = (1024 * markScale) / 32;
  const offset = (1024 - 32 * s) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${BG}"/>
  <g transform="translate(${offset} ${offset}) scale(${s})">
    <path d="M8 22 V10 L13 18 L18 10 V22" stroke="${FG}" stroke-width="2.2" fill="none" stroke-linejoin="miter"/>
    <rect x="21" y="14" width="3" height="8" fill="${FG}"/>
  </g>
</svg>`;
}

const standard = Buffer.from(iconSvg(0.62));
const maskable = Buffer.from(iconSvg(0.47));

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
