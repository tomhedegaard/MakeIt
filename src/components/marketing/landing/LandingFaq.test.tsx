import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import LandingFaq from "./LandingFaq";

const html = render(<LandingFaq />);
const k = da.Marketing.landing.faq;
const items = da.Marketing.faq.items;

describe("LandingFaq", () => {
  it("is the faq section", () => {
    expect(html).toMatch(/<section[^>]*id="faq"/);
    expect(html).toContain(k.heading);
  });

  it("lists inviteOnly first, then the demo question, then the five reused classic answers, in order", () => {
    const order = [
      k.inviteOnly.q,
      k.demo.q,
      items.advanced.q,
      items.wearables.q,
      items.optOutAdaptive.q,
      items.responseTime.q,
      items.hrvScore.q,
    ];
    let cursor = -1;
    for (const q of order) {
      const at = html.indexOf(q);
      expect(at, q).toBeGreaterThan(cursor);
      cursor = at;
    }
  });

  it("shows all seven without a show-more button", () => {
    expect(html.match(/<details/g)).toHaveLength(7);
    expect(html).not.toContain("<button");
  });

  it("has no eyebrow (the third and last belongs to the access panel)", () => {
    expect(html).not.toContain("eyebrow");
  });
});
