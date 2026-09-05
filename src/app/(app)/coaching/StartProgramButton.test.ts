/**
 * @vitest-environment jsdom
 *
 * A thrown server action must surface `failed` (PR #70 left pending
 * cleared and no error). Success must refresh so /coaching does not
 * keep showing the previous active program until a manual reload.
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
  useTranslations: () => (key: string) => key,
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

beforeEach(() => {
  startProgramAction.mockReset();
  refresh.mockReset();
  push.mockReset();
  vi.stubGlobal("confirm", vi.fn(() => true));
});

afterEach(() => {
  act(() => {
    root.unmount();
  });
  host.remove();
  vi.unstubAllGlobals();
});

describe("StartProgramButton", () => {
  it("surfaces failed when the server action throws", async () => {
    startProgramAction.mockRejectedValue(new Error("server action exploded"));
    mount();

    await act(async () => {
      host.querySelector("button")?.click();
    });

    expect(host.querySelector("[role='alert']")?.textContent).toBe(
      "errors.failed",
    );
    expect(refresh).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("refreshes and soft-navigates to /coaching on ok", async () => {
    startProgramAction.mockResolvedValue({ ok: true, sessionsCreated: 4 });
    mount();

    await act(async () => {
      host.querySelector("button")?.click();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/coaching");
    expect(host.querySelector("[role='alert']")).toBeNull();
  });

  it("keeps empty-day programs disabled and never calls the action", async () => {
    mount(false);

    const button = host.querySelector("button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await act(async () => {
      button.click();
    });

    expect(startProgramAction).not.toHaveBeenCalled();
    expect(host.textContent).toContain("emptyDays");
  });
});
