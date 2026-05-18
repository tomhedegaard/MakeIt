"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import { cn } from "@/lib/utils";
import { startWearableConnect } from "@/app/(app)/hrv/connect-actions";

/**
 * Bottom sheet for connecting a wearable to the HRV module (W1: WHOOP only).
 *
 * Presentational client island — the actual OAuth state generation and
 * redirect-URL construction happen server-side in `startWearableConnect`.
 * On success this does a full-page redirect to the provider's consent
 * screen; on failure it surfaces an inline message.
 */

type Provider = {
  id: "whoop" | "oura" | "polar";
  name: string;
  active: boolean;
};

const PROVIDERS: Provider[] = [
  { id: "whoop", name: "WHOOP", active: true },
  { id: "oura", name: "Oura", active: false },
  { id: "polar", name: "Polar", active: false },
];

export default function WearableConnectSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {open ? <WearableConnectBody /> : null}
    </Sheet>
  );
}

function WearableConnectBody() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connectWhoop() {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await startWearableConnect("whoop");
      if (res.ok && res.authUrl) {
        // Full redirect to the WHOOP OAuth consent screen.
        window.location.href = res.authUrl;
        return; // keep pending state through the navigation
      }
      setError(messageFor(res.ok ? undefined : res.error));
      setPending(false);
    } catch {
      setError("Noget gik galt. Prøv igen.");
      setPending(false);
    }
  }

  return (
    <SheetContent>
      <div className="eyebrow mb-2">Wearable</div>
      <h2 className="font-display text-3xl mb-1">Forbind din wearable.</h2>
      <p className="text-fg-dim text-sm mb-6">
        Forbind en wearable for at synke din HRV automatisk — ingen manuel
        indtastning.
      </p>

      <div className="grid gap-3">
        {PROVIDERS.map((provider) =>
          provider.id === "whoop" ? (
            <button
              key={provider.id}
              type="button"
              onClick={connectWhoop}
              disabled={pending}
              aria-busy={pending}
              className={cn(
                "surface-2 rounded-2xl p-5 text-left flex items-center justify-between gap-4 touch-app",
                pending ? "opacity-70" : "lift",
              )}
            >
              <span>
                <span className="block font-display text-lg leading-tight">
                  {provider.name}
                </span>
                <span className="block text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint mt-0.5">
                  {pending ? "Åbner WHOOP…" : "HRV · søvn · recovery"}
                </span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint shrink-0">
                {pending ? "···" : "Forbind →"}
              </span>
            </button>
          ) : (
            <div
              key={provider.id}
              aria-disabled
              className="surface-2 rounded-2xl p-5 flex items-center justify-between gap-4 opacity-45"
            >
              <span className="font-display text-lg leading-tight">
                {provider.name}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-fg-faint border border-line-strong rounded-full px-2 py-0.5 shrink-0">
                Kommer snart
              </span>
            </div>
          ),
        )}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 text-sm text-fg border border-line-strong rounded-lg px-4 py-3"
        >
          {error}
        </p>
      ) : null}

      <p className="mt-6 text-[11px] font-mono uppercase tracking-[0.14em] text-fg-faint leading-relaxed">
        Apple Watch-support kommer med MakeIt-appen til iPhone.
      </p>
    </SheetContent>
  );
}

/** Maps a server-action error code to a member-facing Danish message. */
function messageFor(code: string | undefined): string {
  switch (code) {
    case "demo_mode":
      return "Wearable-forbindelse er ikke tilgængelig i demo-tilstand.";
    case "no_session":
      return "Du skal være logget ind for at forbinde en wearable.";
    case "unsupported_provider":
      return "Denne wearable understøttes ikke endnu.";
    default:
      return "Kunne ikke starte forbindelsen. Prøv igen.";
  }
}
