import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import AskHq, { statusFor } from "./AskHq";
import KalkLanding from "./KalkLanding";

const a = da.Marketing.kalk.ask;

describe("AskHq", () => {
  const html = render(<AskHq />);

  it("is a closed floating button until asked", () => {
    expect(html).toMatch(new RegExp(`<button[^>]*aria-expanded="false"[^>]*>.*${a.open}</button>`));
    expect(html).toMatch(/role="dialog"[^>]*aria-modal="false"[^>]*hidden=""/);
  });

  it("offers suggestions, a labelled input, the privacy line and the waitlist", () => {
    for (const s of Object.values(a.suggestions)) expect(html).toContain(s);
    expect(html).toContain(a.inputLabel);
    expect(html).toContain(a.privacy);
    expect(html).toMatch(/<a[^>]*href="\/#waitlist"[^>]*>Skriv dig på listen<\/a>/);
    expect(html).toContain('role="log"');
  });

  it("maps failures to honest lines", () => {
    expect(statusFor(429)).toBe("limited");
    expect(statusFor(503)).toBe("unavailable");
    expect(statusFor(500)).toBe("error");
  });

  it("sits on the landing", () => {
    expect(render(<KalkLanding />)).toContain(a.open);
  });
});
