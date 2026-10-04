"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  title,
  srTitle,
  description,
  className,
  children,
}: {
  title?: string;
  /** Accessible name when the sheet draws its own heading instead of `title`. */
  srTitle?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  // ponytail: generic fallback lives in Session messages; move to Common when that file is free.
  const t = useTranslations("Session.sheet");
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content
        className={cn("sheet-content", className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <div className="sheet-grabber" aria-hidden />
        {title ? (
          <Dialog.Title className="font-display text-2xl mb-1">{title}</Dialog.Title>
        ) : (
          <Dialog.Title className="sr-only">{srTitle ?? t("fallbackTitle")}</Dialog.Title>
        )}
        {description ? (
          <Dialog.Description className="text-fg-dim text-sm mb-4">
            {description}
          </Dialog.Description>
        ) : null}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
