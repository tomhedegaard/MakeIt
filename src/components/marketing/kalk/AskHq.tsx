"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { PUBLIC_WAITLIST_HREF } from "@/lib/marketing/public-cta";
import { MAX_QUESTION_CHARS, MAX_TURNS } from "@/lib/marketing/ask-hq/schema";
import { tidyAnswer } from "@/lib/marketing/ask-hq/tidy";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };
type Status = "idle" | "pending" | "error" | "limited" | "unavailable";

const SUGGESTIONS = ["s1", "s2", "s3", "s4"] as const;

/** Maps a failed response to the line the visitor sees. */
export function statusFor(httpStatus: number): Status {
  if (httpStatus === 429) return "limited";
  if (httpStatus === 503) return "unavailable";
  return "error";
}

/**
 * "Spørg HQ": a floating button that opens a small chat panel. The
 * answer streams in as plain text. The thread lives only in this
 * component's state; nothing is stored, and a reload starts over.
 * The panel is non-modal, so the page stays usable behind it; Escape
 * closes it and focus returns to the button.
 */
export default function AskHq() {
  const t = useTranslations("Marketing.kalk.ask");
  const locale = useLocale() === "en" ? "en" : "da";
  const id = useId();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const questions = turns.filter((turn) => turn.role === "user").length;
  const full = questions >= MAX_TURNS;
  const pending = status === "pending";

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  async function ask(question: string) {
    const text = question.trim().slice(0, MAX_QUESTION_CHARS);
    if (!text || pending || full) return;

    const thread: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...thread, { role: "assistant", content: "" }]);
    setDraft("");
    setStatus("pending");

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/ask-hq", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale, messages: thread }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        setTurns(thread.slice(0, -1));
        setDraft(text);
        setStatus(statusFor(res.status));
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setTurns([...thread, { role: "assistant", content: answer }]);
      }
      setStatus("idle");
    } catch {
      if (controller.signal.aborted) return;
      setTurns(thread.slice(0, -1));
      setDraft(text);
      setStatus("error");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  function onInputKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(draft);
    }
  }

  function restart() {
    abortRef.current?.abort();
    setTurns([]);
    setStatus("idle");
    inputRef.current?.focus();
  }

  const notice = status === "limited" || status === "unavailable" || status === "error" ? t(status) : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={() => (open ? close() : setOpen(true))}
        className="btn btn-primary fixed bottom-4 right-4 z-40 h-12! gap-2.5 px-5! shadow-[0_18px_30px_-18px_color-mix(in_oklab,var(--fg)_60%,transparent)] md:bottom-6 md:right-6"
      >
        <i aria-hidden="true" className="inline-block size-2 flex-none rounded-full bg-signal" />
        {t("open")}
      </button>

      <div
        id={`${id}-panel`}
        role="dialog"
        aria-modal="false"
        aria-labelledby={`${id}-title`}
        hidden={!open}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        className={cn(
          "fixed inset-x-2 bottom-20 top-[10dvh] z-40 flex flex-col overflow-hidden rounded-[14px] border border-line bg-bg-2 text-fg",
          "shadow-[0_40px_60px_-30px_color-mix(in_oklab,var(--fg)_45%,transparent)]",
          "md:inset-x-auto md:bottom-24 md:right-6 md:top-auto md:h-[min(600px,calc(100dvh-8rem))] md:w-[400px]",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p id={`${id}-title`} className="font-display text-[26px] leading-none!">
              {t("title")}
            </p>
            <p className="mt-1.5 text-[13px] text-fg-dim">{t("sub")}</p>
          </div>
          <button
            type="button"
            aria-label={t("close")}
            onClick={close}
            className="grid size-9 flex-none cursor-pointer place-items-center rounded-full border border-line-bright hover:bg-fg hover:text-bg"
          >
            <svg viewBox="0 0 12 12" aria-hidden="true" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
            </svg>
          </button>
        </div>

        <div
          ref={logRef}
          role="log"
          aria-label={t("log")}
          aria-live="polite"
          aria-busy={pending}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-4"
        >
          {turns.length === 0 ? (
            <>
              <p className="text-[15px] leading-[1.45]">{t("intro")}</p>
              <div role="group" aria-label={t("suggestionsLabel")} className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void ask(t(`suggestions.${key}`))}
                    className="cursor-pointer rounded-full border border-line-bright px-3 py-1.5 text-left text-[13px] hover:bg-fg hover:text-bg"
                  >
                    {t(`suggestions.${key}`)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            turns.map((turn, i) => {
              const me = turn.role === "user";
              const waiting = !me && !turn.content && pending && i === turns.length - 1;
              return (
                <div key={i} className={cn("flex max-w-[88%] flex-col gap-1", me ? "self-end items-end" : "self-start")}>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-dim">
                    {me ? t("you") : t("hq")}
                  </span>
                  <p
                    className={cn(
                      "whitespace-pre-wrap rounded-[14px] px-3.5 py-2.5 text-[14px] leading-[1.45]",
                      me ? "rounded-br-[4px] bg-fg text-bg" : "rounded-bl-[4px] border border-line bg-bg",
                    )}
                  >
                    {waiting ? <span className="text-fg-dim">{t("thinking")}</span> : me ? turn.content : tidyAnswer(turn.content)}
                  </p>
                </div>
              );
            })
          )}
          {notice ? <p className="text-[13px] text-fg-dim">{notice}</p> : null}
          {full ? (
            <p className="text-[13px] text-fg-dim">
              {t("full")}{" "}
              <button type="button" onClick={restart} className="cursor-pointer underline underline-offset-2">
                {t("restart")}
              </button>
            </p>
          ) : null}
        </div>

        <form onSubmit={onSubmit} className="border-t border-line px-4 pb-4 pt-3">
          <div className="flex items-end gap-2">
            <label htmlFor={`${id}-input`} className="sr-only">
              {t("inputLabel")}
            </label>
            <textarea
              ref={inputRef}
              id={`${id}-input`}
              rows={1}
              value={draft}
              maxLength={MAX_QUESTION_CHARS}
              disabled={full}
              placeholder={t("placeholder")}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onInputKey}
              className="max-h-28 min-h-11 flex-1 resize-none rounded-[12px] border border-line-bright bg-bg px-3.5 py-2.5 text-[15px] leading-[1.35] placeholder:text-fg-dim focus-visible:outline-2 focus-visible:outline-fg"
            />
            <button
              type="submit"
              disabled={pending || full || !draft.trim()}
              className="btn btn-primary h-11! flex-none px-4! disabled:cursor-default disabled:opacity-40"
            >
              {t("send")}
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[11px] leading-[1.35] text-fg-dim">
              {t("privacy")}{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                {t("privacyLink")}
              </Link>
            </p>
            <Link
              href={PUBLIC_WAITLIST_HREF}
              onClick={() => setOpen(false)}
              className="flex-none font-mono text-[11px] uppercase tracking-[0.08em] underline underline-offset-4"
            >
              {t("cta")}
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
