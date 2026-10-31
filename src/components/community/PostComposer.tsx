"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent } from "@/components/ui/Sheet";
import FormCheckSheet from "@/components/ui/FormCheckSheet";
import SectionHeader from "@/components/ui/SectionHeader";
import { createPostAction } from "@/app/(app)/community/actions";
import { Video } from "lucide-react";
import { ICON } from "@/components/ui/icon";

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
    if (isPending) return;
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
          <SectionHeader eyebrow={t("eyebrow")} title={t("title")} />

          <div className="pillgroup mb-4">
            {(["PR", "Note", "Form-check"] as const).map((tagOption) => (
              <button
                key={tagOption}
                type="button"
                data-active={tag === tagOption}
                aria-pressed={tag === tagOption}
                className="pill touch-app"
                onClick={() => setTag(tag === tagOption ? null : tagOption)}
              >
                {tagLabels[tagOption]}
              </button>
            ))}
          </div>

          <textarea
            aria-label={t("textLabel")}
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
                <Video {...ICON} className="size-5 text-fg-dim" />
              </div>
              <div>
                <div className="text-copy">{t("addVideo")}</div>
                <div className="text-micro text-fg-dim">{t("addVideoSub")}</div>
              </div>
            </div>
            <span className="text-fg-faint text-meta" aria-hidden="true">→</span>
          </button>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (!isPending) setOpen(false);
              }}
              aria-disabled={isPending}
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!text.trim()}
              aria-disabled={isPending}
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
