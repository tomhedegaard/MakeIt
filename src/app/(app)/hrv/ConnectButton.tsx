"use client";

import { useState } from "react";
import WearableConnectSheet from "@/components/hrv/WearableConnectSheet";

/**
 * Client island that pairs a trigger button with the `WearableConnectSheet`
 * bottom sheet, holding the sheet's `open` state.
 *
 * Used on `/hrv` for both the State-A primary connect CTA and the
 * needs-reauth reconnect banner — the `variant` prop selects the styling.
 */
export default function ConnectButton({
  label,
  variant = "primary",
}: {
  label: string;
  variant?: "primary" | "reauth";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          variant === "primary"
            ? "btn btn-primary btn-xl"
            : "btn btn-sm"
        }
      >
        {label}
      </button>
      <WearableConnectSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
