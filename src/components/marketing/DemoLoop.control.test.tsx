/**
 * @vitest-environment jsdom
 *
 * The pause control must report the element's real playback and start
 * it inside the tap itself — iOS Safari only honours play() from the
 * gesture, and a browser that refuses autoplay must still leave a
 * button that says "play" and works.
 */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DemoLoop from "./DemoLoop";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let paused = true;
let play: ReturnType<typeof vi.fn>;

function mountLoop() {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => {
    root.render(
      <DemoLoop
        src="/exercise-demos/back-squat.webm"
        label="Back squat"
        pauseLabel="Pause"
        playLabel="Afspil"
      />,
    );
  });
  const button = host.querySelector("button");
  if (!button) throw new Error("no control");
  return { host, root, button };
}

function tap(button: HTMLButtonElement) {
  let duringGesture = 0;
  act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    // Still inside the dispatch: nothing async has run yet.
    duringGesture = play.mock.calls.length;
  });
  return duringGesture;
}

let mounted: { host: HTMLDivElement; root: Root } | null = null;

beforeEach(() => {
  paused = true;
  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get: () => paused,
  });
  play = vi.fn(function (this: HTMLMediaElement) {
    paused = false;
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement["play"];
  HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement) {
    paused = true;
    this.dispatchEvent(new Event("pause"));
  };
});

afterEach(() => {
  if (mounted) {
    const { root, host } = mounted;
    act(() => root.unmount());
    host.remove();
    mounted = null;
  }
  vi.restoreAllMocks();
});

describe("DemoLoop control", () => {
  it("viser afspil indtil videoen faktisk kører", () => {
    const { host, root, button } = mountLoop();
    mounted = { host, root };
    expect(button.textContent).toBe("Afspil");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("starter afspilning i selve trykket og skifter til pause", () => {
    const { host, root, button } = mountLoop();
    mounted = { host, root };
    expect(tap(button)).toBe(1); // play() kaldt synkront i gesten
    expect(button.textContent).toBe("Pause");
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("pauser igen på næste tryk", () => {
    const { host, root, button } = mountLoop();
    mounted = { host, root };
    tap(button);
    tap(button);
    expect(button.textContent).toBe("Afspil");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });

  it("bliver på afspil når browseren afviser afspilning", () => {
    play.mockImplementation(() => Promise.reject(new Error("NotAllowedError")));
    const { host, root, button } = mountLoop();
    mounted = { host, root };
    expect(tap(button)).toBe(1);
    expect(button.textContent).toBe("Afspil");
    expect(button.getAttribute("aria-pressed")).toBe("false");
  });
});
