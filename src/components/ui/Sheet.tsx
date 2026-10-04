"use client";

import { useRef } from "react";

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
  // A controlled sheet (no Dialog.Trigger) would hand focus to <body> on
  // close. Remember what had focus when it opened and give it back.
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content
        onOpenAutoFocus={() => {
          opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(e) => {
          if (opener.current?.isConnected) {
            e.preventDefault();
            opener.current.focus();
          }
        }}
        className={cn("sheet-content", className)}
        {...(description ? {} : { "aria-describedby": undefined })}
      >
        <div className="sheet-grabber" aria-hidden />
        {title ? (
          <Dialog.Title className="font-display text-section mb-1">{title}</Dialog.Title>
        ) : (
          <Dialog.Title className="sr-only">{srTitle ?? t("fallbackTitle")}</Dialog.Title>
        )}
        {description ? (
          <Dialog.Description className="text-fg-dim text-copy mb-4">
            {description}
          </Dialog.Description>
        ) : null}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
