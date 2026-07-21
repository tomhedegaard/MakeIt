import { afterEach, describe, expect, it, vi } from "vitest";

// stripe.ts importerer "server-only" (ikke installeret; vitest kører i
// node-miljø uden alias for det). Uden denne mock loader testen slet
// ikke. Samme mønster som src/lib/coach/draft-reply-claude.smoke.test.ts.
vi.mock("server-only", () => ({}));

import { priceIdFor } from "./stripe";

describe("priceIdFor — moduler", () => {
  afterEach(() => {
    delete process.env.STRIPE_PRICE_TRAIN;
  });

  it("returnerer modul-pris fra env når sat", () => {
    process.env.STRIPE_PRICE_TRAIN = "price_train_123";
    expect(priceIdFor("train")).toBe("price_train_123");
  });

  it("returnerer null for modul uden env-pris", () => {
    delete process.env.STRIPE_PRICE_HRV;
    expect(priceIdFor("hrv")).toBeNull();
  });
});
