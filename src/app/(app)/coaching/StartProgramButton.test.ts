/**
 * @vitest-environment jsdom
 *
 * Pending must stay true for the whole server-action await (explicit
 * useState — useTransition drops isPending after the first await).
 * Thrown actions and structured {ok:false} must render a filled alert
 * with a real error string (never a silent short spinner).
 *
 * The next-intl mock is a bare function — no `t.has`. If the button
 * calls `t.has`, rendering the alert throws and the test fails the
 * same way production did after #75.
 */

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const startProgramAction = vi.fn();
const refresh = vi.fn();
const push = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => {
    const t = (key: string) => key;
    return t;
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push }),
}));

vi.mock("./actions", () => ({
  startProgramAction: (...args: unknown[]) => startProgramAction(...args),
}));

import StartProgramButton from "./StartProgramButton";

let root: Root;
let host: HTMLDivElement;

function mount(hasDays = true) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(
      createElement(StartProgramButton, {
        programId: "pwr-10",
        programName: "POWERBUILDING",
        hasOtherActive: true,
        hasDays,
      }),
    );
  });
}

function button(): HTMLButtonElement {
  return host.querySelector("button") as HTMLButtonElement;
}

function alert(): HTMLElement | null {
  return host.querySelector("[role='alert']");
}

beforeEach(() => {
  startProgramAction.mockReset();
  refresh.mockReset();
  push.mockReset();
  vi.stubGlobal("confirm", vi.fn(() => true));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("StartProgramButton", () => {
  it("keeps pending until the action settles, then shows a filled error", async () => {
    let resolveAction!: (value: {
      ok: boolean;
      error?: string;
      detail?: string;
    }) => void;
    startProgramAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );
    mount();

    act(() => {
      button().click();
    });

    expect(button().disabled).toBe(true);
    expect(button().getAttribute("aria-busy")).toBe("true");
    expect(button().textContent).toBe("starting");
    expect(host.textContent).toContain("status.calling");
    expect(alert()).toBeNull();

    await act(async () => {
      resolveAction({
        ok: false,
        error: "not_found",
        detail: "not_found id=pwr-10",
      });
    });

    expect(button().disabled).toBe(false);
    expect(button().getAttribute("aria-busy")).toBe("false");
    expect(button().textContent).toBe("start");
    expect(host.textContent).not.toContain("status.calling");
    expect(alert()?.textContent).toContain("errors.not_found");
    expect(alert()?.textContent).toContain("not_found id=pwr-10");
    expect(alert()?.className).toContain("text-danger");
    expect(alert()?.className).toContain("bg-danger/15");
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("surfaces failed when the server action throws", async () => {
    startProgramAction.mockRejectedValue(new Error("server action exploded"));
    mount();

    await act(async () => {
      button().click();
    });

    expect(alert()?.textContent).toContain("errors.failed");
    expect(alert()?.textContent).toContain("server action exploded");
    expect(alert()?.className).toContain("text-danger");
    expect(console.error).toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("renders a stable alert when the translator has no t.has", async () => {
    startProgramAction.mockResolvedValue({ ok: false, error: "failed" });
    mount();

    await act(async () => {
      button().click();
    });

    expect(alert()?.textContent).toBe("errors.failed");
    expect(host.querySelector("[role='alert']")).not.toBeNull();
  });

  it.each([
    "empty_days",
    "not_allowed",
    "not_found",
    "unavailable",
    "failed",
  ] as const)("renders errors.%s for a structured failure", async (code) => {
    startProgramAction.mockResolvedValue({ ok: false, error: code });
    mount();

    await act(async () => {
      button().click();
    });

    expect(alert()?.textContent).toBe(`errors.${code}`);
    expect(alert()?.className).toMatch(/text-danger/);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("falls back to errors.failed when the action returns an unknown error", async () => {
    startProgramAction.mockResolvedValue({
      ok: false,
      error: "something_else",
      detail: "createServiceClient: SUPABASE_SERVICE_ROLE_KEY is not set.",
    });
    mount();

    await act(async () => {
      button().click();
    });

    expect(alert()?.textContent).toContain("errors.failed");
    expect(alert()?.textContent).toContain(
      "createServiceClient: SUPABASE_SERVICE_ROLE_KEY is not set.",
    );
  });

  it("refreshes and soft-navigates to /coaching on ok", async () => {
    startProgramAction.mockResolvedValue({ ok: true, sessionsCreated: 4 });
    mount();

    await act(async () => {
      button().click();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/coaching");
    expect(host.textContent).toContain("status.ok");
    expect(alert()).toBeNull();
  });

  it("keeps empty-day programs disabled and never calls the action", async () => {
    mount(false);

    expect(button().disabled).toBe(true);

    await act(async () => {
      button().click();
    });

    expect(startProgramAction).not.toHaveBeenCalled();
    expect(host.textContent).toContain("emptyDays");
  });

  it("does not start when confirm is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    startProgramAction.mockResolvedValue({ ok: true, sessionsCreated: 4 });
    mount();

    await act(async () => {
      button().click();
    });

    expect(startProgramAction).not.toHaveBeenCalled();
    expect(button().disabled).toBe(false);
    expect(alert()).toBeNull();
    expect(host.textContent).not.toContain("status.calling");
  });
});
