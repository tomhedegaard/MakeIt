/**
 * @vitest-environment jsdom
 *
 * Native <details> owns expand state. This locks that opening the
 * strip reveals the Motor steps without a JS store.
 */

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import AdaptiveReasonStrip, {
  type AdaptiveStripCopy,
} from "./AdaptiveReasonStrip";
import { demoEngineStrip } from "@/lib/adaptive/engine-strip";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const COPY: AdaptiveStripCopy = {
  why: "Hvorfor",
  attribution: "Motor · Adaptive Engine",
  munkNoteLabel: "Note fra Munk",
  steps: {
    hrvLow: "Hjerte — nattens HRV ligger under dit bånd",
    hrvVeryLow: "very",
    hrvInBand: "in",
    sessionToday: "Krop — dagens pas",
    lowSleep: "sleep",
    alcohol: "alc",
    lowFeeling: "træt",
    rpeOvershoot: "rpe",
    rpeDrift: "drift",
    mentalLoad: "load",
    formCheck: "form",
    missed: "missed",
    noAlcohol: "ingen alkohol",
    mindUnread: "mind",
  },
};

let root: Root;
let host: HTMLDivElement;

beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(
      createElement(AdaptiveReasonStrip, {
        model: demoEngineStrip(),
        copy: COPY,
      }),
    );
  });
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe("AdaptiveReasonStrip expand", () => {
  it("starts collapsed and reveals steps when opened", () => {
    const details = host.querySelector("details") as HTMLDetailsElement;
    expect(details).toBeTruthy();
    expect(details.open).toBe(false);

    act(() => {
      details.open = true;
      details.dispatchEvent(new Event("toggle"));
    });

    expect(details.open).toBe(true);
    expect(host.querySelectorAll("[data-strip-step]").length).toBe(5);
    expect(host.textContent).toContain("Hjerte — nattens HRV ligger under dit bånd");
    expect(host.textContent).toContain("Motor · Adaptive Engine");
  });
});
