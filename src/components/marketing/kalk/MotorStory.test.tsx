import { describe, expect, it } from "vitest";
import { render } from "../test-render";
import da from "../../../../messages/da/index";
import { MOTOR_STEPS } from "@/lib/marketing/kalk/motor-story";
import MotorStory from "./MotorStory";

const html = render(<MotorStory />);
const aria = da.Marketing.kalk.screens;

describe("MotorStory", () => {
  it("is the engine section", () => {
    expect(html).toMatch(/<section[^>]*id="engine"/);
  });

  it("defaults the rig to the decision without JS", () => {
    expect(html.match(/data-active="[^"]*"/g)).toEqual(['data-active="decision"']);
  });

  it("renders all four phone states", () => {
    for (const label of [aria.sleep.aria, aria.hrv.aria, aria.mindChecked.aria, aria.decision.aria]) {
      expect(html).toContain(`aria-label="${label}"`);
    }
  });

  it("offers Behold original on the decision screen", () => {
    const [before, decision] = html.split('data-state="decision"');
    expect(before).not.toContain("Behold original");
    expect(decision).toContain("Behold original");
  });

  it("scales the sticky rig for short viewports", () => {
    const rig = html.match(/<div[^>]*data-active="decision"[^>]*class="([^"]*)"/)?.[1] ?? "";
    expect(rig).toContain("lg:w-[calc(288px*var(--rig-s))]");
    expect(rig).toContain("lg:top-[max(1rem,calc(50svh_-_312px*var(--rig-s)))]");
    expect(rig).toContain("lg:mt-[max(0px,calc(26vh_-_312px*var(--rig-s)))]");
    const state = html.match(/<div[^>]*data-state="sleep"[^>]*class="([^"]*)"/)?.[1] ?? "";
    expect(state).toContain("lg:[transform:scale(var(--rig-s))]");
    expect(state).toContain("lg:origin-top-left");
  });

  it("renders the four report lines with their domains", () => {
    for (const s of MOTOR_STEPS) {
      expect(html).toMatch(new RegExp(`<article[^>]*data-step="${s.key}"[^>]*data-domain="${s.domain}"`));
    }
  });

  it("has the night chart with domain ink and eyebrow 1 of 3", () => {
    expect(html).toContain("<svg");
    expect(html).toContain("stroke-domain");
    expect(html.match(/class="eyebrow/g)).toHaveLength(1);
    expect(html).toContain(da.Marketing.kalk.engine.eyebrow);
  });

  it("viser motorens fire grænser", () => {
    expect((html.match(/data-bound/g) ?? []).length).toBe(4);
  });

  it("siger at pause og deload går til Munk først", () => {
    expect(html).toMatch(/Munk/);
  });
});
