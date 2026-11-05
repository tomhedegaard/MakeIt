import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import { SUPPORT_MAILTO } from "@/lib/company";
import LandingFooter from "./LandingFooter";

const html = render(<LandingFooter />);
const f = da.Marketing.landing.footer;

describe("LandingFooter", () => {
  it("ends on HQ by MAKEIT and the English slogan (spec D4, docs/BRAND_MARK.md)", () => {
    expect(html).toMatch(/>HQ<\/p>[\s\S]*by[\s\S]*<svg[^>]*aria-label="MakeIt"/);
    expect(html).not.toContain("//");
    expect(html).toContain(f.slogan);
  });

  it("links to the legal pages and support email", () => {
    expect(html).toMatch(/<a[^>]*href="\/privacy"[^>]*>/);
    expect(html).toMatch(/<a[^>]*href="\/terms"[^>]*>/);
    expect(html).toContain(`href="${SUPPORT_MAILTO}"`);
  });

  it("carries the sample-data line and no eyebrow", () => {
    expect(html).toContain(f.sample);
    expect(html).not.toContain("eyebrow");
  });
});
