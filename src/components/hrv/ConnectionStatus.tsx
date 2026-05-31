"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { disconnectWearable } from "@/app/(app)/hrv/connect-actions";

/**
 * Renders one wearable connection's live status (W1: WHOOP).
 *
 * Presentational client island — the disconnect mutation runs server-side
 * in `disconnectWearable`, which calls `revalidatePath('/hrv')` so the
 * parent server component re-renders with the updated row.
 */

type Connection = {
  id: string;
  provider: string;
  status: string;
  lastSyncedAt: string | null;
  isPrimary: boolean;
};

const PROVIDER_LABELS: Record<string, string> = {
  whoop: "WHOOP",
  oura: "Oura",
  polar: "Polar",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Forbundet",
  needs_reauth: "Skal fornyes",
  revoked: "Afbrudt",
};

export default function ConnectionStatus({
  connection,
}: {
  connection: Connection;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const providerName =
    PROVIDER_LABELS[connection.provider.toLowerCase()] ??
    capitalize(connection.provider);
  const statusLabel = STATUS_LABELS[connection.status] ?? connection.status;
  const needsAttention = connection.status === "needs_reauth";

  function handleDisconnect() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await disconnectWearable(connection.id);
      if (!res.ok) {
        setError("Kunne ikke afbryde. Prøv igen.");
      }
      // On success the parent re-renders via revalidatePath('/hrv').
    });
  }

  return (
    <div className="surface-2 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-lg leading-tight">
              {providerName}
            </span>
            {connection.isPrimary ? (
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint border border-line-strong rounded-full px-2 py-0.5">
                Primær
              </span>
            ) : null}
          </div>
          <div
            className={cn(
              "mt-1 text-[11px] font-mono uppercase tracking-[0.14em]",
              needsAttention
                ? "text-fg font-semibold"
                : "text-fg-faint",
            )}
          >
            {statusLabel}
          </div>
        </div>

        <button
          type="button"
          onClick={handleDisconnect}
          disabled={isPending}
          aria-busy={isPending}
          className={cn(
            "shrink-0 text-[11px] font-mono uppercase tracking-[0.14em] border border-line-strong rounded-full px-3 py-1.5 touch-app",
            isPending ? "opacity-50" : "lift text-fg-dim",
          )}
        >
          {isPending ? "Afbryder…" : "Afbryd"}
        </button>
      </div>

      <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        {connection.lastSyncedAt
          ? `Sidst synket: ${formatLastSynced(connection.lastSyncedAt)}`
          : "Endnu ikke synket"}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 text-sm text-fg border border-line-strong rounded-lg px-3 py-2"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Turns an ISO timestamp into a short Danish relative label, falling back
 * to a compact absolute date for anything older than a week.
 */
function formatLastSynced(iso: string): string {
  const then = new Date(iso);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return iso;

  const diffMin = Math.round((Date.now() - ms) / 60_000);
  if (diffMin < 1) return "lige nu";
  if (diffMin < 60) return `for ${diffMin} min. siden`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `for ${diffHr} t. siden`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `for ${diffDay} ${diffDay === 1 ? "dag" : "dage"} siden`;

  return then.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
}
