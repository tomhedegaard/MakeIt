/**
 * @vitest-environment jsdom
 *
 * DONE pending must paint immediately from explicit useState — not
 * useFormStatus, which can look idle during a long server action.
 * Overlay + «Bygger dit program…» stay up until hard navigation.
 */

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const completeOnboardingAction = vi.fn();
const locationAssign = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    return t;
  },
}));

vi.mock("./actions", () => ({
  completeOnboardingAction: (...args: unknown[]) =>
    completeOnboardingAction(...args),
}));

import OnboardingClient from "./OnboardingClient";

let root: Root;
let host: HTMLDivElement;

function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(
      createElement(OnboardingClient, {
        memberHandle: "testy",
        err: "gen",
      }),
    );
  });
}

function buttons(): HTMLButtonElement[] {
  return Array.from(host.querySelectorAll("button"));
}

function buttonWith(text: string): HTMLButtonElement {
  const match = buttons().find((el) => el.textContent === text);
  if (!match) {
    throw new Error(
      `No button "${text}". Have: ${buttons()
        .map((el) => el.textContent)
        .join(", ")}`,
    );
  }
  return match;
}

function goToDoneStep() {
  expect(buttonWith("nav.submit").textContent).toBe("nav.submit");
}

beforeEach(() => {
  completeOnboardingAction.mockReset();
  locationAssign.mockReset();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { assign: locationAssign },
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.restoreAllMocks();
});

describe("OnboardingClient DONE pending", () => {
  it("shows overlay and submitting copy immediately, and keeps nav disabled", async () => {
    let resolveAction!: (value: unknown) => void;
    completeOnboardingAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    mount();
    goToDoneStep();

    expect(buttonWith("nav.submit").textContent).toBe("nav.submit");
    expect(host.querySelector("[role='status']")).toBeNull();

    act(() => {
      buttonWith("nav.submit").click();
    });

    const submit = buttonWith("nav.submitting");
    expect(submit.disabled).toBe(true);
    expect(submit.getAttribute("aria-busy")).toBe("true");
    expect(submit.textContent).toContain("nav.submitting");
    expect(buttonWith("nav.back").disabled).toBe(true);
    expect(host.querySelector("[role='status']")).not.toBeNull();
    expect(host.querySelector("form")?.getAttribute("aria-busy")).toBe("true");
    expect(locationAssign).not.toHaveBeenCalled();

    await act(async () => {
      resolveAction(undefined);
    });
  });

  it("hard-navigates to /dashboard when the action returns", async () => {
    completeOnboardingAction.mockResolvedValue(undefined);
    mount();
    goToDoneStep();

    await act(async () => {
      buttonWith("nav.submit").click();
    });

    expect(completeOnboardingAction).toHaveBeenCalledTimes(1);
    expect(locationAssign).toHaveBeenCalledWith("/dashboard");
    expect(host.querySelector("[role='status']")).not.toBeNull();
  });

  it("hard-navigates to the redirect path after a long NEXT_REDIRECT", async () => {
    completeOnboardingAction.mockRejectedValue({
      digest: "NEXT_REDIRECT;replace;/dashboard;307;",
    });
    mount();
    goToDoneStep();

    await act(async () => {
      buttonWith("nav.submit").click();
    });

    expect(locationAssign).toHaveBeenCalledWith("/dashboard");
    expect(host.querySelector("[role='status']")).not.toBeNull();
  });

  it("hard-navigates error redirects so the overlay does not freeze", async () => {
    completeOnboardingAction.mockRejectedValue({
      digest: "NEXT_REDIRECT;replace;/onboarding?err=gen;303;",
    });
    mount();
    goToDoneStep();

    await act(async () => {
      buttonWith("nav.submit").click();
    });

    expect(locationAssign).toHaveBeenCalledWith("/onboarding?err=gen");
  });

  it("hard-navigates to err=gen when the action throws", async () => {
    completeOnboardingAction.mockRejectedValue(new Error("server action exploded"));
    mount();
    goToDoneStep();

    await act(async () => {
      buttonWith("nav.submit").click();
    });

    expect(console.error).toHaveBeenCalled();
    expect(locationAssign).toHaveBeenCalledWith("/onboarding?err=gen");
  });

  it("does not call the action twice while pending", async () => {
    completeOnboardingAction.mockImplementation(() => new Promise(() => {}));
    mount();
    goToDoneStep();

    act(() => {
      buttonWith("nav.submit").click();
    });
    act(() => {
      buttonWith("nav.submitting").click();
    });

    expect(completeOnboardingAction).toHaveBeenCalledTimes(1);
  });

  it("does not complete when advancing from step 2", async () => {
    completeOnboardingAction.mockResolvedValue(undefined);
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => {
      root.render(createElement(OnboardingClient, { memberHandle: "testy" }));
    });

    function clickChoice(title: string) {
      const label = Array.from(host.querySelectorAll("label")).find((el) =>
        el.textContent?.includes(title),
      );
      if (!label) throw new Error(`No choice "${title}"`);
      act(() => {
        label.click();
      });
    }

    clickChoice("goals.strength.title");
    clickChoice("levels.intermediate.title");
    clickChoice("equipment.full.title");
    act(() => {
      buttonWith("nav.next").click();
    });
    expect(host.textContent).toContain("step2.introTitle");
    act(() => {
      buttonWith("nav.next").click();
    });

    expect(completeOnboardingAction).not.toHaveBeenCalled();
    expect(locationAssign).not.toHaveBeenCalled();
    expect(buttonWith("nav.submit").textContent).toBe("nav.submit");
    expect(host.textContent).toContain("step3.introTitle");
  });
});
