import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import AccessPanel from "./AccessPanel";

const html = render(<AccessPanel />);
const a = da.Marketing.kalk.access;

describe("AccessPanel", () => {
  it("is the waitlist section, in a plain Nat block", () => {
    expect(html).toMatch(/<section[^>]*id="waitlist"/);
    expect(html).toMatch(/<div[^>]*data-theme="nat"/);
    expect(html).not.toContain("theme-root");
  });

  it("carries eyebrow 3 of 3", () => {
    expect(html.match(/class="eyebrow/g)).toHaveLength(1);
    expect(html).toContain(a.eyebrow);
  });

  it("labels the email field above the input, with email semantics", () => {
    const label = html.match(/<label[^>]*for="([^"]+)"[^>]*>([^<]*)<\/label>/);
    expect(label).not.toBeNull();
    expect(label?.[2]).toBe(a.emailLabel);

    const fieldId = label![1];
    expect(html.indexOf("<label")).toBeLessThan(html.indexOf(`id="${fieldId}"`, html.indexOf("<label")));

    const inputTag = html.match(new RegExp(`<input[^>]*id="${fieldId}"[^>]*>`))?.[0] ?? "";
    expect(inputTag).toContain('type="email"');
    expect(inputTag).toContain('autoComplete="email"');
    expect(inputTag).toContain('inputMode="email"');
  });

  it("has a polite status region and the company honeypot", () => {
    expect(html).toMatch(/aria-live="polite"/);
    expect(html).toMatch(/<input[^>]*name="company"[^>]*>/);
    const honeypot = html.match(/<input[^>]*name="company"[^>]*>/)?.[0] ?? "";
    expect(honeypot).toContain('tabindex="-1"');
    expect(honeypot).toContain("aria-hidden");
  });

  it("uses a monochrome primary pill, not orange", () => {
    const button = html.match(/<button[^>]*>/)?.[0] ?? "";
    expect(button).toMatch(/class="[^"]*\bbtn\b[^"]*\bbtn-primary\b[^"]*"/);
    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });
});
