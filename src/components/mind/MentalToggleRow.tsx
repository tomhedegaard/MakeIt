"use client";

import Switch from "@/components/ui/Switch";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setMentalToggleAction } from "@/app/(app)/mind/settings/actions";

type Field =
  | "buddy_share_enabled"
  | "cirkel_share_aggregate_enabled"
  | "cirkel_share_daily_enabled"
  | "ai_coach_enabled"
  | "notif_mind_check_evening"
  | "notif_ai_coach_morning"
  | "notif_buddy_mental_alert";

/**
 * One row in /mind/settings — toggle for a single boolean field on
 * mental_settings. Optimistic local state, server confirms via action.
 */
export default function MentalToggleRow({
  field,
  initialValue,
  title,
  description,
  disabled = false,
  disabledReason,
}: {
  field: Field;
  initialValue: boolean;
  title: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    if (disabled || pending) return;
    const next = !value;
    setValue(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("field", field);
      fd.set("value", next ? "1" : "0");
      const res = await setMentalToggleAction(fd);
      if (res && "error" in res) {
        setValue(!next);
        console.warn("[mind] toggle failed", res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-start justify-between gap-6 py-5 border-b hairline">
      <div className="flex-1 space-y-1">
        <div className="font-display text-card">{title}</div>
        <p className="text-fg-dim text-meta">{description}</p>
        {disabled && disabledReason ? (
          <p className="text-fg-dim text-meta italic mt-1">{disabledReason}</p>
        ) : null}
      </div>
      <Switch checked={value} onCheckedChange={() => toggle()} label={title} pending={pending} disabled={disabled} />
    </div>
  );
}
