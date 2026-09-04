import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { confirmAuthUserEmail, type EmailConfirmAdmin } from "./auth-admin";

function mockAdmin(
  impl: EmailConfirmAdmin["auth"]["admin"]["updateUserById"],
): EmailConfirmAdmin {
  return {
    auth: {
      admin: {
        updateUserById: impl,
      },
    },
  };
}

describe("confirmAuthUserEmail", () => {
  it("returns true only when Admin API stamps email_confirmed_at", async () => {
    const updateUserById = vi.fn(async (uid: string) => ({
      data: {
        user: {
          id: uid,
          email_confirmed_at: "2026-09-04T08:00:00.000Z",
        },
      },
      error: null,
    }));

    await expect(
      confirmAuthUserEmail("user-new", mockAdmin(updateUserById)),
    ).resolves.toBe(true);
    expect(updateUserById).toHaveBeenCalledWith("user-new", {
      email_confirm: true,
    });
  });

  it("returns false when the Admin API errors", async () => {
    const updateUserById = vi.fn(async () => ({
      data: { user: null },
      error: { message: "not allowed" },
    }));

    await expect(
      confirmAuthUserEmail("user-new", mockAdmin(updateUserById)),
    ).resolves.toBe(false);
  });

  it("returns false when confirm succeeds without a timestamp", async () => {
    const updateUserById = vi.fn(async () => ({
      data: { user: { email_confirmed_at: null } },
      error: null,
    }));

    await expect(
      confirmAuthUserEmail("user-new", mockAdmin(updateUserById)),
    ).resolves.toBe(false);
  });

  it("does not call Admin API for an empty user id", async () => {
    const updateUserById = vi.fn(async () => ({
      data: { user: { email_confirmed_at: "2026-09-04T08:00:00.000Z" } },
      error: null,
    }));

    await expect(
      confirmAuthUserEmail("", mockAdmin(updateUserById)),
    ).resolves.toBe(false);
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("returns false when the Admin client throws", async () => {
    const updateUserById = vi.fn(async () => {
      throw new Error("network");
    });

    await expect(
      confirmAuthUserEmail("user-new", mockAdmin(updateUserById)),
    ).resolves.toBe(false);
  });
});
