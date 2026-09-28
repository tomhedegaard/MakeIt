import { describe, expect, it, vi } from "vitest";
import { isPublicPath, needsAuth } from "@/lib/auth/public-paths";

const redirect = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ redirect }));

import TrainRedirectPage from "./page";

describe("/train", () => {
  it("forwards to the program instead of 404-ing", () => {
    TrainRedirectPage();
    expect(redirect).toHaveBeenCalledWith("/coaching");
  });

  it("stays behind the auth gate — it is a member redirect, not a public alias", () => {
    expect(needsAuth("/train")).toBe(true);
    expect(isPublicPath("/train")).toBe(false);
    // The catalogue under it keeps working as its own surface.
    expect(needsAuth("/train/exercises")).toBe(true);
  });
});
