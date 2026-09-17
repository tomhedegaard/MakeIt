"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
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

const STATUS_KEYS = ["active", "needs_reauth", "revoked"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];
type ConnectionT = ReturnType<typeof useTranslations<"Hrv.connectionStatus">>;

export default function ConnectionStatus({
  connection,
}: {
  connection: Connection;
}) {
  const t = useTranslations("Hrv.connectionStatus");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const providerName =
    PROVIDER_LABELS[connection.provider.toLowerCase()] ??
    capitalize(connection.provider);
  const statusLabel = (STATUS_KEYS as readonly string[]).includes(connection.status)
    ? t(`status.${connection.status as StatusKey}`)
    : connection.status;
  const needsAttention = connection.status === "needs_reauth";

  function handleDisconnect() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const res = await disconnectWearable(connection.id);
      if (!res.ok) {
        setError(t("error"));
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
                {t("primary")}
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
          {isPending ? t("disconnecting") : t("disconnect")}
        </button>
      </div>

      <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint">
        {connection.lastSyncedAt
          ? t("lastSynced", {
              when: formatLastSynced(connection.lastSyncedAt, t, locale),
            })
          : t("neverSynced")}
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
 * Turns an ISO timestamp into a short localized relative label, falling back
 * to a compact absolute date for anything older than a week.
 */
function formatLastSynced(iso: string, t: ConnectionT, locale: string): string {
  const then = new Date(iso);
  const ms = then.getTime();
  if (Number.isNaN(ms)) return iso;

  const diffMin = Math.round((Date.now() - ms) / 60_000);
  if (diffMin < 1) return t("ago.now");
  if (diffMin < 60) return t("ago.minutes", { count: diffMin });

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return t("ago.hours", { count: diffHr });

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return t("ago.days", { count: diffDay });

  return then.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
}
