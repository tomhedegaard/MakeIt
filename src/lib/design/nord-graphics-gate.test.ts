/**
 * Nord graphics gate (spec §11): one icon language, graphics only where
 * they are data, a figure, a brand mark or device chrome. A new inline
 * <svg> anywhere else is almost always a hand-drawn icon in a private
 * style — use a lucide icon with {...ICON} instead, or add the file
 * here with a reason.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../", import.meta.url));
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const files = walk(SRC)
  .map((p) => relative(SRC, p))
  .filter((p) => p.endsWith(".tsx") && !/\.test\./.test(p) && !p.startsWith("__"));

/** Files allowed to draw their own SVG, and why. */
const GRAPHICS: Record<string, string> = {
  "app/login/page.tsx": "Google and Apple sign-in logos (third-party brand marks)",
  "components/Logo.tsx": "the MakeIt // HQ wordmark",
  "components/adaptive/MotorGlyph.tsx": "the HQ mark: the wordmark's double slash",
  "components/anatomy/AnatomyFigure.tsx": "the muscle figure",
  "components/hrv/HrvBandRange.tsx": "chart",
  "components/hrv/TrendChart.tsx": "chart",
  "components/mind/MentalGraph.tsx": "chart",
  "components/ui/ChartEmptyFrame.tsx": "chart",
  "components/ui/Sparkline.tsx": "chart",
  "components/ui/RestTimer.tsx": "progress ring (data)",
  "components/marketing/landing/LandingMunk.tsx": "Munk's signature",
  "components/marketing/landing/NightCurve.tsx": "chart",
  "components/marketing/phone/PhoneFrame.tsx": "device chrome: signal and battery",
  "components/marketing/phone/screens/HrvScreen.tsx": "chart in the mockup",
  "components/marketing/phone/screens/MindCheckedScreen.tsx": "chart in the mockup",
  "components/marketing/phone/screens/MindScreen.tsx": "chart in the mockup",
  "components/marketing/phone/screens/ProgressScreen.tsx": "chart in the mockup",
  "components/marketing/phone/screens/SessionScreen.tsx": "rest ring in the mockup",
  "components/marketing/phone/screens/SleepScreen.tsx": "chart in the mockup",
};

// Pictographic emoji used as UI. Plain typographic marks (→ · ✓ in copy)
// are text and stay allowed.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2B50}]/u;

describe("one icon language (spec §11)", () => {
  it.each(files)("%s draws no private icons", (p) => {
    const src = readFileSync(join(SRC, p), "utf8");
    if (!(p in GRAPHICS)) expect(src, "inline <svg> outside the graphics allowlist").not.toMatch(/<svg\b/);
    expect(src, "emoji as UI").not.toMatch(EMOJI);
    if (/from "lucide-react"/.test(src) && !p.endsWith("brand/DomainMark.tsx")) {
      expect(src, "lucide icons must spread ICON (1.5 px, square ends)").toMatch(/import \{ ICON \} from "@\/components\/ui\/icon"/);
    }
  });

  it("keeps the allowlist honest: every listed file still draws SVG", () => {
    for (const p of Object.keys(GRAPHICS)) expect(readFileSync(join(SRC, p), "utf8"), p).toMatch(/<svg\b/);
  });
});

describe("copy has no emoji as UI (spec §5)", () => {
  const MSG = fileURLToPath(new URL("../../../messages/", import.meta.url));
  const json = walk(MSG).filter((p) => p.endsWith(".json"));
  it.each(json.map((p) => relative(MSG, p)))("%s", (p) => {
    expect(readFileSync(join(MSG, p), "utf8")).not.toMatch(EMOJI);
  });
});
