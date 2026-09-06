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
 *
 * Confirm is inline — never `window.confirm`. First click only
 * reveals Yes/Cancel; the action runs on the confirm click.
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

function mount(hasDays = true, hasOtherActive = true) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(
      createElement(StartProgramButton, {
        programId: "pwr-10",
        programName: "POWERBUILDING",
        hasOtherActive,
        hasDays,
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

function startButton(): HTMLButtonElement {
  return buttonWith("start");
}

function pendingButton(): HTMLButtonElement {
  return buttonWith("starting");
}

function confirmButton(hasOtherActive = true): HTMLButtonElement {
  return buttonWith(hasOtherActive ? "confirmSwitch" : "confirmStart");
}

function cancelButton(): HTMLButtonElement {
  return buttonWith("cancel");
}

function alert(): HTMLElement | null {
  return host.querySelector("[role='alert']");
}

function openConfirm() {
  act(() => {
    startButton().click();
  });
}

async function confirmStart(hasOtherActive = true) {
  await act(async () => {
    confirmButton(hasOtherActive).click();
  });
}

beforeEach(() => {
  startProgramAction.mockReset();
  refresh.mockReset();
  push.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.restoreAllMocks();
});

describe("StartProgramButton", () => {
  it("shows inline confirm on first click and does not call the action", () => {
    mount();

    openConfirm();

    expect(startProgramAction).not.toHaveBeenCalled();
    expect(host.textContent).toContain("switchConfirm");
    expect(confirmButton().textContent).toBe("confirmSwitch");
    expect(cancelButton().textContent).toBe("cancel");
    expect(host.textContent).not.toContain("status.calling");
    expect(alert()).toBeNull();
  });

  it("calls the action only after the confirm click", async () => {
    startProgramAction.mockResolvedValue({ ok: true, sessionsCreated: 4 });
    mount();

    openConfirm();
    expect(startProgramAction).not.toHaveBeenCalled();

    await confirmStart();

    expect(startProgramAction).toHaveBeenCalledTimes(1);
    expect(startProgramAction).toHaveBeenCalledWith("pwr-10");
  });

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

    openConfirm();
    act(() => {
      confirmButton().click();
    });

    expect(pendingButton().disabled).toBe(true);
    expect(pendingButton().getAttribute("aria-busy")).toBe("true");
    expect(pendingButton().textContent).toBe("starting");
    expect(host.textContent).toContain("status.calling");
    expect(alert()).toBeNull();

    await act(async () => {
      resolveAction({
        ok: false,
        error: "not_found",
        detail: "not_found id=pwr-10",
      });
    });

    expect(startButton().disabled).toBe(false);
    expect(startButton().getAttribute("aria-busy")).toBe("false");
    expect(startButton().textContent).toBe("start");
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

    openConfirm();
    await confirmStart();

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

    openConfirm();
    await confirmStart();

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

    openConfirm();
    await confirmStart();

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

    openConfirm();
    await confirmStart();

    expect(alert()?.textContent).toContain("errors.failed");
    expect(alert()?.textContent).toContain(
      "createServiceClient: SUPABASE_SERVICE_ROLE_KEY is not set.",
    );
  });

  it("refreshes and soft-navigates to /coaching on ok", async () => {
    startProgramAction.mockResolvedValue({ ok: true, sessionsCreated: 4 });
    mount();

    openConfirm();
    await confirmStart();

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/coaching");
    expect(host.textContent).toContain("status.ok");
    expect(alert()).toBeNull();
  });

  it("keeps empty-day programs disabled and never calls the action", async () => {
    mount(false);

    expect(buttons()[0].disabled).toBe(true);

    await act(async () => {
      buttons()[0].click();
    });

    expect(startProgramAction).not.toHaveBeenCalled();
    expect(host.textContent).toContain("emptyDays");
    expect(host.textContent).not.toContain("switchConfirm");
    expect(host.textContent).not.toContain("startConfirm");
  });

  it("returns to idle and does not call the action when confirm is cancelled", async () => {
    startProgramAction.mockResolvedValue({ ok: true, sessionsCreated: 4 });
    mount();

    openConfirm();
    await act(async () => {
      cancelButton().click();
    });

    expect(startProgramAction).not.toHaveBeenCalled();
    expect(startButton().disabled).toBe(false);
    expect(startButton().textContent).toBe("start");
    expect(host.textContent).not.toContain("switchConfirm");
    expect(host.textContent).not.toContain("status.calling");
    expect(alert()).toBeNull();
  });

  it("uses startConfirm copy when no other program is active", () => {
    mount(true, false);

    openConfirm();

    expect(host.textContent).toContain("startConfirm");
    expect(host.textContent).not.toContain("switchConfirm");
    expect(confirmButton(false).textContent).toBe("confirmStart");
    expect(startProgramAction).not.toHaveBeenCalled();
  });
});
