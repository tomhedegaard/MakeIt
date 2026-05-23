"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import FormCheckSheet from "@/components/ui/FormCheckSheet";
import { createPostAction } from "@/app/(app)/community/actions";

export default function PostComposer({
  trigger,
}: {
  trigger: React.ReactNode;
}) {
  const t = useTranslations("Community.composer");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [tag, setTag] = useState<"PR" | "Note" | "Form-check" | null>(null);
  const [formCheckOpen, setFormCheckOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const tagLabels: Record<"PR" | "Note" | "Form-check", string> = {
    PR: t("tagPr"),
    Note: t("tagNote"),
    "Form-check": t("tagFormCheck"),
  };

  function reset() {
    setText("");
    setTag(null);
  }

  function submit() {
    const fd = new FormData();
    fd.set("content", text);
    if (tag) fd.set("tag", tag);
    startTransition(async () => {
      const res = await createPostAction(fd);
      if (res.ok) {
        reset();
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <span onClick={() => setOpen(true)}>{trigger}</span>
        <SheetContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="eyebrow mb-1">{t("eyebrow")}</div>
              <h2 className="font-display text-2xl">{t("title")}</h2>
            </div>
          </div>

          <div className="pillgroup mb-4">
            {(["PR", "Note", "Form-check"] as const).map((tagOption) => (
              <button
                key={tagOption}
                type="button"
                data-active={tag === tagOption}
                className="pill touch-app"
                onClick={() => setTag(tag === tagOption ? null : tagOption)}
              >
                {tagLabels[tagOption]}
              </button>
            ))}
          </div>

          <textarea
            className="field min-h-[120px] py-3 resize-none w-full"
            placeholder={
              tag === "PR"
                ? t("placeholderPr")
                : tag === "Form-check"
                  ? t("placeholderFormCheck")
                  : t("placeholderDefault")
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          <button
            type="button"
            className="surface rounded-xl p-4 mt-3 text-left flex items-center justify-between gap-3 lift touch-app w-full"
            onClick={() => setFormCheckOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-bg-3 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="size-5 text-fg-dim" fill="none" aria-hidden>
                  <rect x="3" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M17 10l4-2v8l-4-2v-4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <div className="text-sm">{t("addVideo")}</div>
                <div className="text-xs text-fg-dim">{t("addVideoSub")}</div>
              </div>
            </div>
            <span className="text-fg-faint text-sm">→</span>
          </button>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              type="button"
              className="btn"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!text.trim() || isPending}
              onClick={submit}
            >
              {isPending ? t("sending") : t("submit")}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <FormCheckSheet open={formCheckOpen} onOpenChange={setFormCheckOpen} />
    </>
  );
}
