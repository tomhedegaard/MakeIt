"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { ShoppingGroup } from "@/lib/nutrition/shopping";

/**
 * Checked state lives in localStorage keyed by plan.id, so it
 * survives navigation and pull-to-refresh but doesn't sync across
 * devices. That's fine for a shopping trip — the typical use is
 * tick on phone in the supermarket, regenerate on next plan, fresh
 * state. Add a Supabase-backed sync table later if cross-device
 * checks become a real ask.
 *
 * Implementation note: localStorage is read via useSyncExternalStore
 * so the server snapshot is a stable empty list (no hydration
 * mismatch), and same-tab writes refresh the snapshot via a manual
 * "storage" event dispatch (the native event only fires across tabs).
 */

const STORAGE_PREFIX = "makeit:shopping:";
const SAME_TAB_EVENT = "makeit:shopping-changed";

export default function ShoppingChecklist({
  planId,
  groups,
}: {
  planId: string;
  groups: ShoppingGroup[];
}) {
  const storageKey = `${STORAGE_PREFIX}${planId}`;
  const checkedJson = useSyncExternalStore(
    subscribeToStorage,
    () => readSnapshot(storageKey),
    () => "[]"
  );

  const checked = useMemo<Set<string>>(() => {
    try {
      const arr = JSON.parse(checkedJson);
      if (Array.isArray(arr)) {
        return new Set(arr.filter((s): s is string => typeof s === "string"));
      }
    } catch {
      // corrupt entry — fall through to empty set
    }
    return new Set();
  }, [checkedJson]);

  const totals = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const g of groups) {
      for (const item of g.items) {
        total += 1;
        if (checked.has(item.key)) done += 1;
      }
    }
    return { total, done };
  }, [groups, checked]);

  function toggle(key: string) {
    const next = new Set(checked);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persist(storageKey, next);
  }

  function reset() {
    if (!confirm("Nulstil alle afkrydsninger?")) return;
    persist(storageKey, new Set());
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <section className="surface-2 rounded-xl px-5 py-4">
        <div className="flex items-baseline justify-between mb-2">
          <div className="eyebrow">Fremdrift</div>
          <span className="numeric text-sm">
            {totals.done} <span className="text-fg-dim">/ {totals.total}</span>
          </span>
        </div>
        <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-fg transition-all"
            style={{
              width: totals.total === 0 ? "0%" : `${(totals.done / totals.total) * 100}%`,
            }}
            aria-hidden
          />
        </div>
        {totals.done > 0 ? (
          <button
            type="button"
            onClick={reset}
            className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint hover:text-fg-dim mt-3"
          >
            Nulstil
          </button>
        ) : null}
      </section>

      {/* Groups */}
      {groups.map((g) => {
        const groupTotal = g.items.length;
        const groupDone = g.items.filter((i) => checked.has(i.key)).length;
        return (
          <section key={g.category} className="surface-2 rounded-2xl overflow-hidden">
            <header className="px-5 py-3 border-b hairline flex items-baseline justify-between">
              <h2 className="font-display text-xl">{g.label}</h2>
              <span className="numeric text-[11px] text-fg-faint">
                {groupDone}/{groupTotal}
              </span>
            </header>
            <ul className="divide-y hairline">
              {g.items.map((item) => {
                const isChecked = checked.has(item.key);
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => toggle(item.key)}
                      aria-pressed={isChecked}
                      className="w-full text-left px-5 py-3 flex items-center gap-4 hover:bg-bg-3/50 transition-colors"
                      style={{ opacity: isChecked ? 0.45 : 1 }}
                    >
                      <span
                        aria-hidden
                        className="size-5 shrink-0 rounded border hairline-strong flex items-center justify-center transition-colors"
                        style={{
                          background: isChecked ? "var(--fg)" : "transparent",
                          color: isChecked ? "var(--bg)" : "transparent",
                        }}
                      >
                        ✓
                      </span>
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm"
                          style={{
                            textDecoration: isChecked ? "line-through" : "none",
                          }}
                        >
                          {item.name}
                        </div>
                        {item.mealCount > 1 ? (
                          <div className="text-[10px] font-mono text-fg-faint uppercase tracking-[0.14em] mt-0.5">
                            til {item.mealCount} måltider
                          </div>
                        ) : null}
                      </div>
                      <div className="numeric text-sm shrink-0 text-fg-dim">
                        {formatAmount(item.amount)} {item.unit}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {groups.length === 0 ? (
        <section className="surface-2 rounded-2xl p-8 text-center text-sm text-fg-dim">
          Ingen ingredienser i ugens plan.
        </section>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * useSyncExternalStore plumbing
 * ---------------------------------------------------------------- */

function readSnapshot(key: string): string {
  if (typeof window === "undefined") return "[]";
  try {
    return window.localStorage.getItem(key) ?? "[]";
  } catch {
    return "[]";
  }
}

function subscribeToStorage(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  // Cross-tab: the native event fires for OTHER tabs only.
  window.addEventListener("storage", callback);
  // Same-tab: we dispatch a custom event from persist() below.
  window.addEventListener(SAME_TAB_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SAME_TAB_EVENT, callback);
  };
}

function persist(key: string, value: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(value)));
    window.dispatchEvent(new Event(SAME_TAB_EVENT));
  } catch {
    // localStorage full or disabled — drop silently
  }
}

function formatAmount(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(1).replace(/\.0$/, "");
}
