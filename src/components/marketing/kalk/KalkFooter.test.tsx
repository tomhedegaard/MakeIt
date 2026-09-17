import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import { SUPPORT_MAILTO } from "@/lib/company";
import KalkFooter from "./KalkFooter";

const html = render(<KalkFooter />);
const f = da.Marketing.kalk.footer;

describe("KalkFooter", () => {
  it("carries the wordmark and the English slogan (spec D4)", () => {
    expect(html).toContain("MakeIt");
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
