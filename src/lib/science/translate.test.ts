import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { keepVerifiedTranslation } from "./summarize";
import { translateMissing } from "./run";

const CONCLUSION = "Creatine >= 5 g/day yields small gains (SMD 0.37) in lean mass.";

describe("keepVerifiedTranslation", () => {
  it("keeps a translation whose numbers are all in the original", () => {
    const da = "Kreatin >= 5 g/dag giver små gevinster (SMD 0.37) i fedtfri masse.";
    expect(keepVerifiedTranslation(da, CONCLUSION)).toBe(da);
  });

  it("drops a translation that changes or adds a number", () => {
    expect(keepVerifiedTranslation("Kreatin >= 5 g/dag giver SMD 0,37.", CONCLUSION)).toBeNull();
    expect(keepVerifiedTranslation("Kreatin 10 g/dag giver SMD 0.37.", CONCLUSION)).toBeNull();
  });

  it("drops empty text, a missing original and advice language", () => {
    expect(keepVerifiedTranslation("  ", CONCLUSION)).toBeNull();
    expect(keepVerifiedTranslation("Kreatin virker.", null)).toBeNull();
    expect(keepVerifiedTranslation("Du bør tage kreatin.", CONCLUSION)).toBeNull();
  });
});

type Row = { id: string; title: string; source_conclusion: string | null };

function fakeDb(rows: Row[]) {
  const updates: { id: string; values: Record<string, unknown> }[] = [];
  const filters: Record<string, unknown> = {};
  const db = {
    from() {
      return {
        select() {
          const q = {
            eq: (col: string, val: unknown) => ((filters[col] = val), q),
            is: (col: string, val: unknown) => ((filters[col] = val), q),
            order: () => q,
            limit: async (n: number) => ({ data: rows.slice(0, n), error: null }),
          };
          return q;
        },
        update(values: Record<string, unknown>) {
          return { eq: async (_col: string, id: string) => (updates.push({ id, values }), { error: null }) };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { db, updates, filters };
}

describe("translateMissing", () => {
  it("asks only for untranslated published rows and stamps every attempt", async () => {
    const { db, updates, filters } = fakeDb([
      { id: "a", title: "Creatine for strength", source_conclusion: CONCLUSION },
      { id: "b", title: "VR mindfulness", source_conclusion: null },
    ]);
    const n = await translateMissing(db, async (item) => ({
      title_da: item.title === "Creatine for strength" ? "Kreatin for styrke" : null,
      source_conclusion_da: null,
    }));
    expect(n).toBe(2);
    expect(filters).toMatchObject({ status: "published", translated_at: null });
    expect(updates.map((u) => u.id).sort()).toEqual(["a", "b"]);
    const a = updates.find((u) => u.id === "a")!.values;
    expect(a.title_da).toBe("Kreatin for styrke");
    expect(typeof a.translated_at).toBe("string");
    // A discarded translation is still stamped so it is not retried daily.
    expect(updates.find((u) => u.id === "b")!.values).toMatchObject({ title_da: null });
  });

  it("leaves a row for tomorrow when the call itself fails", async () => {
    const { db, updates } = fakeDb([{ id: "a", title: "t", source_conclusion: null }]);
    await translateMissing(db, async () => {
      throw new Error("timeout");
    });
    expect(updates).toHaveLength(0);
  });
});
