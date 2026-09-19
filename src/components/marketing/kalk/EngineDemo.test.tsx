import { describe, expect, it } from "vitest";
import { render } from "@/components/marketing/test-render";
import EngineDemo from "./EngineDemo";

describe("EngineDemo", () => {
  const html = render(<EngineDemo />);
  const panel = html.slice(html.indexOf('aria-live="polite"'));

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
    const head = html.slice(html.indexOf('aria-live="polite"'), html.indexOf("sr-only"));
    expect(head).toContain("I dag");
    expect(head).not.toContain("Dagens pas opdateret");
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
    expect(panel).toContain("Behold original");
    expect(panel).not.toMatch(/<button/);
    expect(panel).not.toMatch(/<a[ >]/);
  });

  it("har præcis én live-region og én kopi af panelet", () => {
    expect((html.match(/aria-live="polite"/g) ?? []).length).toBe(1);
    expect((html.match(/Back squat/g) ?? []).length).toBe(1);
    expect((html.match(/Behold original/g) ?? []).length).toBe(1);
  });

  it("er et almindeligt Kalk-kort under lg: ingen kant, ingen telefon-krom", () => {
    const open = panel.slice(0, panel.indexOf(">"));
    expect(open).toMatch(/rounded-\[14px\]/);
    expect(open).toMatch(/border border-line/);
    expect(open).toMatch(/bg-bg-2/);
    expect(open).toMatch(/\bw-full\b/);
    // Den håndrullede ramme er væk.
    expect(html).not.toMatch(/rounded-\[44px\]/);
    expect(html).not.toMatch(/rounded-\[38px\]/);
    expect(html).not.toMatch(/rounded-\[36px\]/);
  });

  it("folder sig ud til en telefon fra lg med PhoneFrames mål", () => {
    const open = panel.slice(0, panel.indexOf(">"));
    expect(open).toMatch(/lg:\[--pw:288px\]/);
    expect(open).toMatch(/lg:aspect-\[9\/19\.5\]/);
    expect(open).toMatch(/lg:rounded-\[calc\(var\(--pw\)\*0\.16\)\]/);
    expect(open).toMatch(/lg:bg-fg/);
    expect(panel).toMatch(/lg:rounded-\[calc\(var\(--pw\)\*0\.13\)\]/);
    expect(panel).toMatch(/lg:bg-bg\b/);
    // Status- og fanebjælken er PhoneFrames egne, kun synlige fra lg.
    expect(panel).toMatch(/hidden lg:flex/);
    expect(panel).toMatch(/hidden lg:grid/);
  });

  it("sætter resultatet før skyderne på mobil og bytter om fra lg", () => {
    expect(html).toMatch(/order-2[^"]*lg:order-1/);
    const open = panel.slice(0, panel.indexOf(">"));
    expect(open).toMatch(/order-1[^"]*lg:order-2/);
    // Ét DOM, ikke to varianter: skyderne står én gang.
    expect((html.match(/id="demo-sleep"/g) ?? []).length).toBe(1);
  });

  it("inviterer til at prøve skyderne på mobil", () => {
    expect(html).toContain("Prøv selv: flyt en skyder.");
  });
});
