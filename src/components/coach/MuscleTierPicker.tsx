"use client";

import {
  MUSCLE_LABELS,
  type MuscleGroup,
  type MuscleTier,
} from "@/lib/data/muscle-groups";

/**
 * Assigns each muscle group to a tier (primary / secondary / tertiary)
 * or none. A muscle lives in at most one tier — picking a new tier
 * moves it; picking its current tier clears it. Used both for an
 * exercise's overall recruitment and per-phase recruitment.
 *
 * Controlled: pass `value`, get the full next triple via `onChange`.
 */

export type MuscleTiers = {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  tertiary: MuscleGroup[];
};

const ALL_MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

// Same three Krop strengths as the muscle figure the member sees (spec §11).
const TIER_DOT: Record<MuscleTier, string> = {
  primary: "var(--muscle-primary)",
  secondary: "var(--muscle-secondary)",
  tertiary: "var(--muscle-tertiary)",
};

const TIER_LABEL: Record<MuscleTier, string> = {
  primary: "P",
  secondary: "S",
  tertiary: "T",
};

export default function MuscleTierPicker({
  value,
  onChange,
}: {
  value: MuscleTiers;
  onChange: (next: MuscleTiers) => void;
}) {
  function tierOf(m: MuscleGroup): MuscleTier | null {
    if (value.primary.includes(m)) return "primary";
    if (value.secondary.includes(m)) return "secondary";
    if (value.tertiary.includes(m)) return "tertiary";
    return null;
  }

  function toggle(m: MuscleGroup, tier: MuscleTier) {
    const current = tierOf(m);
    const next: MuscleTiers = {
      primary: value.primary.filter((x) => x !== m),
      secondary: value.secondary.filter((x) => x !== m),
      tertiary: value.tertiary.filter((x) => x !== m),
    };
    // Re-add unless the click was on the muscle's current tier.
    if (current !== tier) next[tier] = [...next[tier], m];
    onChange(next);
  }

  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
      {ALL_MUSCLES.map((m) => {
        const t = tierOf(m);
        return (
          <div key={m} className="flex items-center gap-2 py-0.5">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ background: t ? TIER_DOT[t] : "var(--anatomy-idle)" }}
              aria-hidden
            />
            <span className="flex-1 text-sm truncate">{MUSCLE_LABELS[m]}</span>
            {(["primary", "secondary", "tertiary"] as MuscleTier[]).map(
              (tier) => {
                const on = t === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => toggle(m, tier)}
                    aria-pressed={on}
                    className="size-6 text-micro border hairline transition-colors"
                    style={
                      on
                        ? {
                            background: TIER_DOT[tier],
                            color: tier === "primary" ? "var(--bg)" : "var(--fg)",
                            borderColor: "transparent",
                          }
                        : undefined
                    }
                  >
                    {TIER_LABEL[tier]}
                  </button>
                );
              },
            )}
          </div>
        );
      })}
    </div>
  );
}
