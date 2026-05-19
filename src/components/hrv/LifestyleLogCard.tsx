"use client";

import { useState, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { logLifestyleEvent } from "@/app/(app)/hrv/lifestyle-actions";
import { FEELING_STATES, type FeelingState } from "@/lib/hrv/lifestyle";

/**
 * Daily lifestyle quick-log card for `/hrv` (V2.1 Task 5).
 *
 * Members record the day's lifestyle context — alcohol, sleep, mood, late
 * meals, illness, and (when cycle-tracking is on) menstruation start. Each
 * control writes through `logLifestyleEvent`, which upserts on
 * `(member_id, logged_for_date, event_type)` so re-logging overwrites.
 *
 * Interaction model mirrors the settings toggles (`HrvSettingsSection`):
 * optimistic local state + `useTransition`; on a `{ ok: false }` result the
 * control rolls back to its prior value and an inline `role="alert"` error
 * is shown.
 */

type Props = {
  initialLogs: Record<string, unknown>;
  cycleTrackingEnabled: boolean;
};

/* ---- value-shape readers (initialLogs is untrusted jsonb) ---------------- */

function readAlcohol(value: unknown): 0 | 1 | 2 | 3 | null {
  if (typeof value !== "object" || value === null) return null;
  const count = (value as { count?: unknown }).count;
  if (count === 0 || count === 1 || count === 2 || count === 3) return count;
  return null;
}

function readSleep(value: unknown): number | null {
  if (typeof value !== "object" || value === null) return null;
  const hours = (value as { hours?: unknown }).hours;
  return typeof hours === "number" && Number.isFinite(hours) ? hours : null;
}

function readFeeling(value: unknown): FeelingState | null {
  if (typeof value !== "object" || value === null) return null;
  const state = (value as { state?: unknown }).state;
  return typeof state === "string" &&
    (FEELING_STATES as readonly string[]).includes(state)
    ? (state as FeelingState)
    : null;
}

function readBool(value: unknown, key: string): boolean {
  if (typeof value !== "object" || value === null) return false;
  return (value as Record<string, unknown>)[key] === true;
}

/* ---- shared sub-components ---------------------------------------------- */

const SELECTOR_BTN =
  "flex-1 min-w-0 text-[11px] font-mono uppercase tracking-[0.12em] " +
  "rounded-full border px-3 py-2 touch-app transition-colors";

function Selector<T extends string | number>({
  label,
  options,
  value,
  disabled,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | null;
  disabled: boolean;
  onSelect: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onSelect(opt.value)}
            className={cn(
              SELECTOR_BTN,
              active
                ? "bg-fg text-bg border-fg"
                : "border-line-strong text-fg-dim",
              disabled && !active && "opacity-50",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: ReactNode;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer touch-app">
      <span className="flex-1 min-w-0 text-sm text-fg-dim">{label}</span>
      <span className="shrink-0">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span
          aria-hidden
          className="block relative w-12 h-7 rounded-full border hairline-strong"
          style={{ background: checked ? "var(--fg)" : "var(--bg-3)" }}
        >
          <span
            className="absolute top-0.5 left-0.5 size-6 rounded-full transition-transform"
            style={{
              background: checked ? "var(--bg)" : "var(--fg-dim)",
              transform: checked ? "translateX(20px)" : "translateX(0)",
            }}
          />
        </span>
      </span>
    </label>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="eyebrow">{label}</div>
      {children}
    </div>
  );
}

/* ---- card ---------------------------------------------------------------- */

export default function LifestyleLogCard({
  initialLogs,
  cycleTrackingEnabled,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [alcohol, setAlcohol] = useState<0 | 1 | 2 | 3 | null>(
    readAlcohol(initialLogs.alcohol_drinks),
  );
  const [sleep, setSleep] = useState<number | null>(
    readSleep(initialLogs.sleep_hours),
  );
  const [feeling, setFeeling] = useState<FeelingState | null>(
    readFeeling(initialLogs.feeling),
  );
  const [lateMeal, setLateMeal] = useState<boolean>(
    readBool(initialLogs.late_meal, "late"),
  );
  const [sick, setSick] = useState<boolean>(
    readBool(initialLogs.sick, "sick"),
  );
  const [menstruationLogged, setMenstruationLogged] = useState<boolean>(
    typeof initialLogs.menstrual_start === "object" &&
      initialLogs.menstrual_start !== null,
  );

  /**
   * Apply an optimistic state change, fire the server action, and roll the
   * control back to `prev` if the action fails.
   */
  function commit<T>(
    eventType: string,
    value: unknown,
    prev: T,
    rollback: (v: T) => void,
  ) {
    setError(null);
    startTransition(async () => {
      const res = await logLifestyleEvent(eventType, value);
      if (!res.ok) {
        rollback(prev);
        setError("Kunne ikke gemme — prøv igen.");
      }
    });
  }

  function selectAlcohol(next: 0 | 1 | 2 | 3) {
    const prev = alcohol;
    setAlcohol(next);
    commit("alcohol_drinks", { count: next }, prev, setAlcohol);
  }

  function changeSleep(raw: string) {
    if (raw === "") {
      setSleep(null);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const next = Math.min(24, Math.max(0, parsed));
    const prev = sleep;
    setSleep(next);
    commit("sleep_hours", { hours: next }, prev, setSleep);
  }

  function selectFeeling(next: FeelingState) {
    const prev = feeling;
    setFeeling(next);
    commit("feeling", { state: next }, prev, setFeeling);
  }

  function toggleLateMeal(next: boolean) {
    const prev = lateMeal;
    setLateMeal(next);
    commit("late_meal", { late: next }, prev, setLateMeal);
  }

  function toggleSick(next: boolean) {
    const prev = sick;
    setSick(next);
    commit("sick", { sick: next }, prev, setSick);
  }

  function markMenstruation() {
    if (menstruationLogged) return;
    const date = new Date().toISOString().slice(0, 10);
    setMenstruationLogged(true);
    commit("menstrual_start", { date }, false, setMenstruationLogged);
  }

  return (
    <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-5">
      <div>
        <div className="eyebrow mb-1">Livsstil</div>
        <h2 className="font-display text-2xl">I dag</h2>
      </div>

      <Row label="Alkohol">
        <Selector<0 | 1 | 2 | 3>
          label="Alkohol"
          value={alcohol}
          disabled={pending}
          onSelect={selectAlcohol}
          options={[
            { value: 0, label: "0" },
            { value: 1, label: "1" },
            { value: 2, label: "2" },
            { value: 3, label: "3+" },
          ]}
        />
      </Row>

      <Row label="Søvn">
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            max={24}
            step={0.5}
            value={sleep ?? ""}
            disabled={pending}
            onChange={(e) => changeSleep(e.target.value)}
            aria-label="Timers søvn"
            className="w-24 disabled:opacity-50"
          />
          <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
            timer
          </span>
        </div>
      </Row>

      <Row label="Tilstand">
        <Selector<FeelingState>
          label="Tilstand"
          value={feeling}
          disabled={pending}
          onSelect={selectFeeling}
          options={[
            { value: "fresh", label: "Frisk" },
            { value: "ok", label: "OK" },
            { value: "tired", label: "Træt" },
            { value: "stressed", label: "Stresset" },
          ]}
        />
      </Row>

      <ul className="divide-y hairline border-y hairline">
        <li className="py-3">
          <Toggle
            label="Sent måltid"
            checked={lateMeal}
            disabled={pending}
            onChange={toggleLateMeal}
          />
        </li>
        <li className="py-3">
          <Toggle
            label="Syg i dag — udelades fra baseline"
            checked={sick}
            disabled={pending}
            onChange={toggleSick}
          />
        </li>
      </ul>

      {cycleTrackingEnabled ? (
        <Row label="Menstruation">
          <button
            type="button"
            onClick={markMenstruation}
            disabled={pending || menstruationLogged}
            aria-pressed={menstruationLogged}
            className={cn(
              "w-full text-[11px] font-mono uppercase tracking-[0.12em] rounded-full border px-4 py-2.5 touch-app transition-colors",
              menstruationLogged
                ? "bg-fg text-bg border-fg"
                : "border-line-strong text-fg-dim lift",
              pending && !menstruationLogged && "opacity-50",
            )}
          >
            {menstruationLogged
              ? "✓ Menstruation markeret i dag"
              : "Markér menstruation startede i dag"}
          </button>
        </Row>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="text-sm text-fg border border-line-strong rounded-lg px-3 py-2"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
