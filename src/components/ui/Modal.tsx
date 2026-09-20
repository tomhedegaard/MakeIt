"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

/**
 * Centred modal on Radix Dialog, the same primitive as the session's
 * "Afslut session?" sheet: focus is trapped while it is open, Escape and
 * a click on the backdrop close it, and the rest of the page is inert
 * for assistive tech. Hand-rolled `role="dialog"` overlays did none of
 * that (UX review 2026-09-19).
 *
 * The visible heading stays the caller's own markup; `title` is the
 * short name a screen reader announces when the dialog opens.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-scrim backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2",
            "max-h-[92dvh] overflow-y-auto rounded-2xl border hairline bg-bg-2 p-6 md:p-8",
            className,
          )}
        >
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {description ? (
            <Dialog.Description className="sr-only">{description}</Dialog.Description>
          ) : (
            <Dialog.Description className="sr-only">{title}</Dialog.Description>
          )}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export const ModalClose = Dialog.Close;
