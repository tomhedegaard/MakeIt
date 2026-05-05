"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="sheet-overlay" />
      <Dialog.Content className={cn("sheet-content", className)}>
        <div className="sheet-grabber" aria-hidden />
        {title ? (
          <Dialog.Title className="font-display text-2xl mb-1">{title}</Dialog.Title>
        ) : (
          <Dialog.Title className="sr-only">Bottom sheet</Dialog.Title>
        )}
        {description ? (
          <Dialog.Description className="text-fg-dim text-sm mb-4">
            {description}
          </Dialog.Description>
        ) : (
          <Dialog.Description className="sr-only">
            Modal sheet content
          </Dialog.Description>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
