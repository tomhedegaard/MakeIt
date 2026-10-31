import { describe, expect, it, vi } from "vitest";

import { render } from "@/components/marketing/test-render";
import type { MorningSignalInput } from "@/lib/dashboard/morning-signal";
import MorningSignal from "./MorningSignal";

// The sheet's server actions are server-only; the card only needs the trigger.
vi.mock("@/app/(app)/nutrition/OffPlanLogButton", () => ({
  default: ({ variant }: { variant?: string }) => <button data-variant={variant}>+ Spiste noget andet</button>,
}));

const input: MorningSignalInput = {
  hrv: { latestMs: 48, bucket: "low", band: { lowMs: 54, highMs: 68 }, nightsMs: [60, 55, 48] },
  mind: null,
  intake: { consumedKcal: 1312, targetKcal: 2740, consumedProtein: 96, targetProtein: 182 },
  trainingDay: true,
};

describe("MorningSignal", () => {
  const html = render(<MorningSignal input={input} />);

  it("renders three domain cards that link to their pillar", () => {
    expect(html.match(/<a /g)).toHaveLength(3);
    for (const d of ["heart", "food", "mind"]) expect(html).toContain(`data-domain="${d}"`);
    expect(html).not.toContain('data-domain="body"');
    expect(html).toContain('href="/hrv"');
  });

  it("labels the row once", () => {
    expect(html.match(/aria-label=/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Morgenens signal"');
  });

  it("uses a domain kicker, one big number, a why-line and a full sentence for screen readers", () => {
    expect(html).toContain("eyebrow eyebrow-domain");
    expect(html).toMatch(/numeric text-title[^"]*"[^>]*>1\.312/);
    expect(html).toContain("af 2.740 kcal");
    expect(html).toContain("Træningsdag · 96 af 182 g protein");
    expect(html).toContain("Dit normalområde 54 til 68 ms");
    expect(html).toContain("Mad. 1.312 af 2.740 kcal. Træningsdag · 96 af 182 g protein.");
    expect(html).toContain("data-sparkline");
    expect(html).toContain('data-ink="bar"');
  });

  it("offers Spiste noget andet on the food card without a floating button", () => {
    expect(html).toContain('data-variant="card"');
  });

  it("uses no raw colours, status colours or remaining", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/rgba?\(/);
    expect(html).not.toMatch(/text-(warn|danger|ok|success|red|green|amber)|bg-(warn|danger|ok|success)/);
    expect(html).not.toMatch(/tilbage/i);
  });

  it("shows an action when data is missing", () => {
    const empty = render(
      <MorningSignal
        input={{
          hrv: null,
          mind: null,
          intake: { consumedKcal: 0, targetKcal: null, consumedProtein: 0, targetProtein: null },
          trainingDay: false,
        }}
      />,
    );
    expect(empty).toContain("Forbind wearable");
    expect(empty).toContain("Tjek ind");
    expect(empty).toContain("Hviledag");
  });

  it("keeps sr-only sentences inside positioned links", () => {
    const links = html.match(/<a [^>]*class="[^"]*"/g) ?? [];
    expect(links.length).toBe(3);
    for (const a of links) expect(a).toMatch(/class="relative /);
  });
});
