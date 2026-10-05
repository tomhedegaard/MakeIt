import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import { MUNK_PORTRAIT_SRC } from "@/lib/marketing/munk";
import LandingMunk from "./LandingMunk";

const html = render(<LandingMunk />);
const m = da.Marketing.landing.munk;

describe("LandingMunk", () => {
  it("is the munk section with its heading", () => {
    expect(html).toMatch(/<section[^>]*id="munk"/);
    expect(html).toContain(m.heading);
  });

  it("shows the four flow steps with their timestamps", () => {
    const flow = html.match(/<ol[^>]*>[\s\S]*?<\/ol>/)?.[0] ?? "";
    expect(flow.match(/<li[\s>]/g)).toHaveLength(4);
    expect(m.flow).toHaveLength(4);
    for (const step of m.flow) {
      expect(flow).toContain(step.t);
      expect(flow).toContain(step.label);
    }
  });

  it("strikes the AI draft and shows the final answer", () => {
    expect(html).toMatch(new RegExp(`<s[^>]*>${m.card.draft}</s>`));
    expect(html).toContain("decoration-signal");
    expect(html).toContain(m.card.final);
  });

  it("signs the card with an accessible signature", () => {
    expect(html).toMatch(/<svg[^>]*role="img"[^>]*aria-label="Underskrift, Mikael Munk"/);
  });

  it("uses the MoveKit loop as a labelled reference", () => {
    expect(html).toContain("<video");
    expect(html).toContain("/exercise-demos/back-squat");
    expect(html).toMatch(/<span[^>]*>Reference<\/span>/);
  });

  it("shows the approved portrait in the circle, named for screen readers", () => {
    expect(MUNK_PORTRAIT_SRC).toBe("/landing/munk-portrait.jpg");
    expect(html).toMatch(/<img[^>]*alt="Mikael Munk, hovedcoach"[^>]*rounded-full/);
  });

  it("has no eyebrow and no hardcoded colours", () => {
    expect(html).not.toContain('class="eyebrow');
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
