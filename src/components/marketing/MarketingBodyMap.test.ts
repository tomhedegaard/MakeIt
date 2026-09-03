/**
 * @vitest-environment jsdom
 *
 * Interactive landing body-map: rest = all four lit; selecting a
 * domain kicker updates MakeItFigure's highlight.
 */

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import MarketingBodyMap from "./MarketingBodyMap";

let root: Root;
let host: HTMLDivElement;

function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(createElement(MarketingBodyMap));
  });
}

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
});

describe("MarketingBodyMap", () => {
  beforeEach(mount);

  it("defaults to the four-domain teaching state", () => {
    const figure = host.querySelector(".makeit-figure");
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute("data-highlighted")).toBe(
      "mind heart body food",
    );
    expect(figure?.getAttribute("data-mode")).toBe("teaching");
    expect(host.querySelector(".makeit-figure-halo")).toBeNull();
    expect(host.querySelector(".makeit-figure-halo-glow")).toBeNull();
    expect(figure?.getAttribute("class")).toContain("h-[22rem]");
    expect(figure?.getAttribute("class")).toContain("lg:h-[36rem]");
    expect(host.querySelector("[data-body-map-kicker]")).not.toBeNull();
    expect(host.querySelector("[data-landing-beat='helhed']")).not.toBeNull();
    expect(host.textContent).toContain("figure.whole.body");
    expect(host.textContent).toContain("heading");
    expect(host.textContent).not.toContain("intro");
  });

  it("selecting a domain kicker lights only that domain", () => {
    const food = host.querySelector(
      "[data-body-map-kicker='food']",
    ) as HTMLButtonElement;
    expect(food).toBeTruthy();

    act(() => {
      food.focus();
    });

    const figure = host.querySelector(".makeit-figure");
    expect(figure?.getAttribute("data-highlighted")).toBe("food");
    expect(figure?.getAttribute("data-mode")).toBe("focus");
    expect(host.querySelector(".makeit-figure-halo")).not.toBeNull();
    expect(host.querySelector(".makeit-figure-halo-glow")).not.toBeNull();
    expect(host.textContent).toContain("figure.food.body");
    expect(host.textContent).not.toContain("figure.whole.body");
  });

  it("leaving the kicker returns to all four + helhed", () => {
    const heart = host.querySelector(
      "[data-body-map-kicker='heart']",
    ) as HTMLButtonElement;

    act(() => {
      heart.focus();
    });
    expect(
      host.querySelector(".makeit-figure")?.getAttribute("data-highlighted"),
    ).toBe("heart");

    act(() => {
      heart.blur();
    });

    expect(
      host.querySelector(".makeit-figure")?.getAttribute("data-highlighted"),
    ).toBe("mind heart body food");
    expect(host.textContent).toContain("figure.whole.body");
  });
});
