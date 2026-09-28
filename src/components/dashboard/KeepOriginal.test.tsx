import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(app)/session/[id]/actions", () => ({
  setAdaptationResponseAction: vi.fn(async () => ({ ok: true })),
}));

import { render } from "@/components/marketing/test-render";
import KeepOriginal, { claimKeepSubmit, nextKeepState } from "./KeepOriginal";

describe("KeepOriginal", () => {
  it("offers a ghost 'Behold original' while undecided", () => {
    const html = render(<KeepOriginal modifierId="m" sessionId="s" accepted={null} />);
    expect(html).toContain("Behold original");
    expect(html).toContain("btn-ghost");
    expect(html).not.toContain("btn-primary");
  });

  it("confirms the kept plan and hides the button once declined", () => {
    const html = render(<KeepOriginal modifierId="m" sessionId="s" accepted={false} />);
    expect(html).not.toContain("<button");
    expect(html).toContain('role="status"');
    expect(html).toContain("Du kører den oprindelige plan i dag.");
  });
});

describe("nextKeepState", () => {
  it("goes pending on submit", () => {
    expect(nextKeepState("idle", { type: "submit" })).toBe("pending");
    expect(nextKeepState("error", { type: "submit" })).toBe("pending");
  });

  it("stays kept after a successful answer, even though demo does not persist", () => {
    expect(nextKeepState("pending", { type: "result", ok: true })).toBe("kept");
  });

  it("shows the error and brings the button back on failure", () => {
    expect(nextKeepState("pending", { type: "result", ok: false })).toBe("error");
  });
});

describe("claimKeepSubmit", () => {
  it("lets only the first of two fast clicks through", () => {
    const inFlight = { current: false };
    expect(claimKeepSubmit(inFlight)).toBe(true);
    expect(claimKeepSubmit(inFlight)).toBe(false);
    inFlight.current = false;
    expect(claimKeepSubmit(inFlight)).toBe(true);
  });
});

describe("setAdaptationResponseAction", () => {
  it("revalidates the dashboard too", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/(app)/session/[id]/actions.ts"),
      "utf8",
    );
    expect(src).toMatch(/revalidatePath\("\/dashboard"\)/);
  });
});
