import { describe, expect, it } from "vitest";

import { render } from "@/components/marketing/test-render";
import MorningSignal from "./MorningSignal";

const input = {
  session: { adapted: true },
  hrv: { rmssdMs: 48, bucket: "low" as const },
  mindCheckedToday: false,
  intake: { consumedKcal: 640, targetKcal: 2740 },
};

describe("MorningSignal", () => {
  const html = render(<MorningSignal input={input} />);

  it("renders four domain links", () => {
    expect(html.match(/<a /g)).toHaveLength(4);
    for (const d of ["body", "heart", "mind", "food"]) {
      expect(html).toContain(`data-domain="${d}"`);
    }
    expect(html).toContain('href="/hrv"');
  });

  it("labels the row once", () => {
    expect(html.match(/aria-label=/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Morgenens signal"');
  });

  it("uses domain kickers, mono numbers and a full sentence for screen readers", () => {
    expect(html).toContain("eyebrow eyebrow-domain");
    expect(html).toMatch(/font-mono[^"]*"[^>]*>48/);
    expect(html).toContain("Under bånd");
    expect(html).toContain("sr-only");
    expect(html).toContain("2740");
  });

  it("uses no raw colours or status colours", () => {
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(html).not.toMatch(/rgba?\(/);
    expect(html).not.toMatch(/text-(warn|danger|ok|success|red|green|amber)/);
  });

  it("shows plain status text when data is missing", () => {
    const empty = render(
      <MorningSignal
        input={{ session: null, hrv: null, mindCheckedToday: true, intake: { consumedKcal: 0, targetKcal: null } }}
      />,
    );
    expect(empty).toContain("Intet pas");
    expect(empty).toContain("Ingen måling");
    expect(empty).toContain("Tjekket ind");
  });
});
