/**
 * @vitest-environment jsdom
 *
 * Three-beat landing loop: Program + Form-check proofs.
 * Helhed lives on MarketingBodyMap; phones are the gallery.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  FormCheckProof,
  LandingBeat,
  ProgramProof,
} from "./LandingLoop";
import { PROGRAM_PROOF } from "@/lib/marketing/loop-proof";

const t = (key: string) => key;

describe("LandingBeat", () => {
  it("uses Everfit rhythm: eyebrow, heading, one sentence, one visual", () => {
    const html = renderToStaticMarkup(
      createElement(
        LandingBeat,
        {
          beat: "program",
          domain: "body",
          eyebrow: "01 — Program",
          heading: "Ugen skriver sig om.",
          body: "Motoren skar topsættet.",
        },
        createElement("div", { "data-proof": "yes" }, "proof"),
      ),
    );
    expect(html).toContain('data-landing-beat="program"');
    expect(html).toContain('data-domain="body"');
    expect(html).toContain("eyebrow");
    expect(html).toContain("Ugen skriver sig om.");
    expect(html).toContain("Motoren skar topsættet.");
    expect(html).toContain("data-proof");
    expect(html).not.toContain("sparkle");
    expect(html).not.toContain("orb");
  });
});

describe("ProgramProof", () => {
  it("shows a week cell that shifted after the engine rewrite", () => {
    const html = renderToStaticMarkup(createElement(ProgramProof, { t }));
    expect(html).toContain('data-landing-proof="program"');
    expect(html).toContain('data-landing-week-cell="thu"');
    expect(html).toContain('data-shifted="true"');
    expect(html).toContain('data-landing-shift');
    expect(html).toContain(String(PROGRAM_PROOF.beforeKg));
    expect(html).toContain(String(PROGRAM_PROOF.afterKg));
    expect(html).toContain("domain-mark--body");
    expect(html).toContain("domain-stroke");
    expect(html).toContain("proof.beforeValue");
    expect(html).toContain("proof.afterValue");
    expect(html).not.toContain("text-body");
  });
});

describe("FormCheckProof", () => {
  it("is film → Munk note → next session — not chat theater", () => {
    const html = renderToStaticMarkup(createElement(FormCheckProof, { t }));
    expect(html).toContain('data-landing-proof="form-check"');
    expect(html).toContain('data-landing-step="01"');
    expect(html).toContain('data-landing-step="02"');
    expect(html).toContain('data-landing-step="03"');
    expect(html).toContain("data-landing-film");
    expect(html).toContain("proof.step2Signed");
    expect(html).not.toContain("chat");
    expect(html).not.toContain("sparkle");
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("GIF");
  });
});

describe("LandingLoop composition", () => {
  it("keeps Helhed and phones out of the Program / Form-check section", () => {
    const program = renderToStaticMarkup(
      createElement(
        LandingBeat,
        {
          beat: "program",
          domain: "body",
          eyebrow: "01",
          heading: "Program",
          body: "Rewrite.",
        },
        createElement(ProgramProof, { t }),
      ),
    );
    const form = renderToStaticMarkup(
      createElement(
        LandingBeat,
        {
          beat: "form-check",
          eyebrow: "02",
          heading: "Form-check",
          body: "Note.",
        },
        createElement(FormCheckProof, { t }),
      ),
    );
    const html = program + form;
    expect(html).toContain('data-landing-beat="program"');
    expect(html).toContain('data-landing-beat="form-check"');
    expect(html).not.toContain('data-landing-beat="helhed"');
    expect(html).not.toContain("makeit-figure");
    expect(html).not.toContain("sparkle");
  });
});
