"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const DISMISS_KEY = "mi_install_hint_dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Quiet "add to home screen" hint (docs/APP_STORE_PLAN.md Fase 1).
 *
 * Shows only when it can matter: touch device, browser tab (not an
 * installed app), not previously dismissed. Android/Chrome gets the
 * native install prompt via beforeinstallprompt; iOS Safari has no
 * prompt API, so it gets the share-sheet instruction instead.
 * Dismissal is sticky per device (localStorage).
 */
export default function InstallHint() {
  const t = useTranslations("Dashboard.installHint");
  const [mode, setMode] = useState<"hidden" | "ios" | "generic">("hidden");
  const [canPrompt, setCanPrompt] = useState(false);
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Deferred so the decision runs after hydration — the server
    // always renders the hidden state, and we avoid a sync setState
    // in the effect body (react-hooks/set-state-in-effect).
    const timer = window.setTimeout(() => {
      if (localStorage.getItem(DISMISS_KEY)) return;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator &&
          (navigator as { standalone?: boolean }).standalone === true);
      if (standalone) return;
      if (!window.matchMedia("(pointer: coarse)").matches) return;
      const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
      setMode(isIos ? "ios" : "generic");
    }, 0);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      promptEvent.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  if (mode === "hidden") return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  }

  async function install() {
    const ev = promptEvent.current;
    if (!ev) return;
    await ev.prompt();
    await ev.userChoice;
    dismiss();
  }

  return (
    <aside className="surface-2 rounded-xl px-5 py-4">
      <div className="eyebrow mb-1.5">{t("eyebrow")}</div>
      <div className="text-sm mb-1">{t("title")}</div>
      <p className="text-xs text-fg-dim leading-relaxed">
        {mode === "ios" ? t("bodyIos") : t("bodyAndroid")}
      </p>
      <div className="mt-3 flex items-center gap-2">
        {canPrompt ? (
          <button type="button" onClick={install} className="btn btn-primary btn-sm">
            {t("install")}
          </button>
        ) : null}
        <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm">
          {t("dismiss")}
        </button>
      </div>
    </aside>
  );
}
