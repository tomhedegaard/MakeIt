import { describe, expect, it } from "vitest";
import { render } from "@/components/marketing/test-render";
import EngineDemo from "./EngineDemo";

describe("EngineDemo", () => {
  const html = render(<EngineDemo />);

  it("viser standardtilstandens sænkning", () => {
    expect(html).toContain("135");
    expect(html).toContain("150");
  });

  it("har tre skydere med labels og tastaturvenlige felter", () => {
    expect((html.match(/<input[^>]+type="range"/g) ?? []).length).toBe(3);
    expect(html).toMatch(/<label[^>]+for="demo-sleep"/);
    expect(html).toMatch(/<label[^>]+for="demo-hrv"/);
    expect(html).toMatch(/<label[^>]+for="demo-stress"/);
  });

  it("annoncerer ændringen til skærmlæsere", () => {
    expect(html).toMatch(/aria-live="polite"/);
  });

  it("viser en statisk kicker, ikke opdateringstekst, for seende", () => {
    const phone = html.slice(html.indexOf('aria-live="polite"'), html.indexOf("sr-only"));
    expect(phone).toContain("I dag");
    expect(phone).not.toContain("Dagens pas opdateret");
  });

  it("giver skærmlæsere det opdaterede topsæt i en skjult tekst", () => {
    const srOnly = html.slice(html.indexOf('class="sr-only"'));
    expect(srOnly).toContain("Dagens pas opdateret:");
    expect(srOnly).toContain("150");
  });

  it("siger at båndet er et demo-bånd", () => {
    expect(html).toMatch(/Demo-bånd/);
  });

  it("viser 'behold original' som en linje, ikke en knap", () => {
    const phone = html.slice(html.indexOf('aria-live="polite"'));
    expect(phone).toContain("Behold original");
    expect(phone).not.toMatch(/<button/);
    expect(phone).not.toMatch(/<a[ >]/);
  });
});
