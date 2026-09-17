import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import KalkHero from "./KalkHero";

const html = render(<KalkHero />);

describe("KalkHero", () => {
  it("carries the Danish H1", () => {
    expect(html).toMatch(/<h1[^>]*>[^<]*Bygget til dem der løfter\.[^<]*<\/h1>/);
  });

  it("has exactly one primary button", () => {
    expect(html.match(/btn-primary/g)).toHaveLength(1);
  });

  it("strikes 150 in signal and sets 135 beside it", () => {
    expect(html).toMatch(/<span[^>]*class="[^"]*strike-signal[^"]*"[^>]*>150<\/span>\s*<span[^>]*>135/);
  });

  it("shows the dashboard phone", () => {
    expect(html).toContain(`aria-label="${da.Marketing.kalk.screens.dashboard.aria}"`);
  });

  it("has no eyebrow and no stats band", () => {
    expect(html).not.toContain("eyebrow");
    expect(html).not.toContain("data-stats");
  });
});
