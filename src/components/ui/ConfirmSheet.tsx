"use client";

import { useTranslations } from "next-intl";
import { Sheet, SheetContent } from "@/components/ui/Sheet";

/**
 * Yes/no question in the Nord bottom sheet, the same pattern as the
 * session's "Afslut session?". Replaces native window.confirm(), which
 * drew the browser's own dialog outside the design.
 */
export default function ConfirmSheet({
  open,
  onOpenChange,
  title,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const t = useTranslations("Common");
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent title={title}>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button type="button" className="btn" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
