"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConnectionStatus from "@/components/hrv/ConnectionStatus";
import WearableConnectSheet from "@/components/hrv/WearableConnectSheet";
import {
  setPrimaryConnection,
  setCycleTracking,
  setSessionSuggestionEnabled,
} from "@/app/(app)/hrv/connect-actions";
import type { HrvSettings } from "@/lib/data/settings";

/**
 * HRV section for the settings page.
 *
 * Server data (connections + cycle-tracking flag) is fetched in the
 * settings server component and passed in; this island owns the
 * interactive bits — the connect sheet's open state, the set-primary
 * mutation, and the cycle-tracking toggle. The mutating server actions
 * (`setPrimaryConnection`, `setCycleTracking`) already no-op in demo
 * mode, so this renders cleanly with an empty connection list there.
 */

export default function HrvSettingsSection({
  hrv,
}: {
  hrv: HrvSettings;
}) {
  const router = useRouter();
  const { connections } = hrv;

  /* Connect sheet */
  const [sheetOpen, setSheetOpen] = useState(false);

  /* Set-primary */
  const [primaryPending, startPrimary] = useTransition();
  const [primaryError, setPrimaryError] = useState<string | null>(null);

  /* Cycle tracking */
  const [cycleEnabled, setCycleEnabled] = useState(hrv.cycleTrackingEnabled);
  const [cyclePending, startCycle] = useTransition();
  const [cycleMsg, setCycleMsg] = useState<string | null>(null);

  /* Session suggestion toggle */
  const [nudgeEnabled, setNudgeEnabled] = useState(hrv.sessionSuggestionEnabled);
  const [nudgePending, startNudge] = useTransition();
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);

  function makePrimary(connectionId: string) {
    if (primaryPending) return;
    setPrimaryError(null);
    startPrimary(async () => {
      const res = await setPrimaryConnection(connectionId);
      if (res.ok) {
        router.refresh();
      } else {
        setPrimaryError("Kunne ikke gøre primær — prøv igen.");
      }
    });
  }

  function toggleCycle(next: boolean) {
    const prev = cycleEnabled;
    setCycleEnabled(next);
    setCycleMsg(null);
    startCycle(async () => {
      const res = await setCycleTracking(next);
      if (res.ok) {
        setCycleMsg("✓ Gemt");
        window.setTimeout(() => setCycleMsg(null), 2200);
      } else {
        setCycleEnabled(prev);
        setCycleMsg("Kunne ikke gemme — prøv igen.");
      }
    });
  }

  function toggleNudge(next: boolean) {
    const prev = nudgeEnabled;
    setNudgeEnabled(next);
    setNudgeMsg(null);
    startNudge(async () => {
      const res = await setSessionSuggestionEnabled(next);
      if (res.ok) {
        setNudgeMsg("✓ Gemt");
        window.setTimeout(() => setNudgeMsg(null), 2200);
      } else {
        setNudgeEnabled(prev);
        setNudgeMsg("Kunne ikke gemme — prøv igen.");
      }
    });
  }

  return (
    <section className="surface-2 rounded-2xl p-5 lg:p-7 space-y-5">
      <div>
        <div className="eyebrow mb-1">HRV</div>
        <h2 className="font-display text-2xl">Wearables og recovery</h2>
      </div>

      {/* Wearable connections */}
      <div className="space-y-3">
        <div className="eyebrow">Forbundne wearables</div>
        {connections.length === 0 ? (
          <div className="rounded-xl border hairline px-4 py-4 space-y-3">
            <p className="text-sm text-fg-dim leading-relaxed">
              Du har ingen wearable forbundet. Forbind én, så synker MakeIt
              din HRV automatisk hver morgen.
            </p>
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setSheetOpen(true)}
            >
              Forbind wearable
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {connections.map((connection) => (
              <li key={connection.id} className="space-y-2">
                <ConnectionStatus connection={connection} />
                {connections.length > 1 && !connection.isPrimary ? (
                  <button
                    type="button"
                    className="text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim border border-line-strong rounded-full px-3 py-1.5 touch-app lift disabled:opacity-50"
                    onClick={() => makePrimary(connection.id)}
                    disabled={primaryPending}
                  >
                    {primaryPending ? "Gemmer…" : "Gør primær"}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {primaryError ? (
          <p
            role="alert"
            className="text-[10px] font-mono uppercase tracking-[0.16em] text-fg-dim"
          >
            {primaryError}
          </p>
        ) : null}
      </div>

      {/* Cycle-tracking toggle */}
      <ul className="divide-y hairline border-t hairline">
        <li className="py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm">Cyklus-tracking</div>
            <div className="text-xs text-fg-dim mt-0.5">
              Justér din baseline for menstruationscyklussen, så din readiness
              tager højde for de naturlige HRV-udsving.
            </div>
          </div>
          <label className="shrink-0 cursor-pointer touch-app">
            <input
              type="checkbox"
              checked={cycleEnabled}
              onChange={(e) => toggleCycle(e.target.checked)}
              disabled={cyclePending}
              className="sr-only peer"
            />
            <span
              aria-hidden
              className="block relative w-12 h-7 rounded-full border hairline-strong transition-colors peer-checked:bg-fg peer-checked:border-fg"
              style={{ background: cycleEnabled ? "var(--fg)" : "var(--bg-3)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 size-6 rounded-full transition-transform"
                style={{
                  background: cycleEnabled ? "var(--bg)" : "var(--fg-dim)",
                  transform: cycleEnabled
                    ? "translateX(20px)"
                    : "translateX(0)",
                }}
              />
            </span>
          </label>
        </li>
        <li className="py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-sm">Vis HRV-nudge på workouts</div>
            <div className="text-xs text-fg-dim mt-0.5">
              Når din readiness er lav i dag, ser du en kort note øverst på dagens
              session. Slå fra, hvis du hellere vil have ro.
            </div>
          </div>
          <label className="shrink-0 cursor-pointer touch-app">
            <input
              type="checkbox"
              checked={nudgeEnabled}
              onChange={(e) => toggleNudge(e.target.checked)}
              disabled={nudgePending}
              className="sr-only peer"
            />
            <span
              aria-hidden
              className="block relative w-12 h-7 rounded-full border hairline-strong transition-colors peer-checked:bg-fg peer-checked:border-fg"
              style={{ background: nudgeEnabled ? "var(--fg)" : "var(--bg-3)" }}
            >
              <span
                className="absolute top-0.5 left-0.5 size-6 rounded-full transition-transform"
                style={{
                  background: nudgeEnabled ? "var(--bg)" : "var(--fg-dim)",
                  transform: nudgeEnabled
                    ? "translateX(20px)"
                    : "translateX(0)",
                }}
              />
            </span>
          </label>
        </li>
      </ul>
      {cycleMsg ? (
        <span
          className="text-[10px] font-mono uppercase tracking-[0.16em]"
          style={{ color: cycleMsg.startsWith("✓") ? "var(--fg)" : "var(--fg-dim)" }}
        >
          {cycleMsg}
        </span>
      ) : null}
      {nudgeMsg ? (
        <span
          className="text-[10px] font-mono uppercase tracking-[0.16em]"
          style={{ color: nudgeMsg.startsWith("✓") ? "var(--fg)" : "var(--fg-dim)" }}
        >
          {nudgeMsg}
        </span>
      ) : null}

      {/* Link to the full module */}
      <Link
        href="/hrv"
        className="block text-[11px] font-mono uppercase tracking-[0.14em] text-fg-dim lift"
      >
        Se din fulde HRV →
      </Link>

      <WearableConnectSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </section>
  );
}
