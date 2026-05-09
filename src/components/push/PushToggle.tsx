"use client";

import { useEffect, useState, useTransition } from "react";
import {
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
  sendTestPushAction,
} from "@/app/(app)/push/actions";

type State =
  | "loading" // checking permission + existing sub
  | "unsupported" // PushManager unavailable
  | "denied" // user blocked at OS / browser level
  | "off" // can subscribe, not currently subscribed
  | "on"; // subscribed

/**
 * Subscribe / unsubscribe button for Web Push. Three failure modes
 * we surface differently:
 *   - unsupported → don't render the toggle at all (iOS Safari pre-PWA-install)
 *   - denied     → render disabled with a "tilladt i browser" hint
 *   - off + click + no VAPID key → action returns ok=false, we revert
 *
 * The VAPID public key is read from NEXT_PUBLIC_VAPID_PUBLIC_KEY at
 * client load. If it's empty the button is disabled with a config
 * hint — better than letting the user click and get a cryptic error.
 */
export default function PushToggle({
  vapidPublicKey,
}: {
  vapidPublicKey: string;
}) {
  const [state, setState] = useState<State>("loading");
  const [pending, startTransition] = useTransition();
  const [testSentAt, setTestSentAt] = useState<number | null>(null);

  // Initial state: we can detect support / permission synchronously,
  // but the *subscription* check is async (PushManager.getSubscription).
  // Keep the effect; the lint rule is overly strict for a true
  // external-system probe like this.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "unsupported") return null;

  const noKey = !vapidPublicKey;

  async function handleSubscribe() {
    if (noKey || pending) return;

    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
    }

    let sub: PushSubscription | null = null;
    try {
      const reg = await navigator.serviceWorker.ready;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    } catch (err) {
      console.warn("[push] subscribe() failed:", err);
      return;
    }

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    startTransition(async () => {
      const res = await savePushSubscriptionAction({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh!,
        auth: json.keys!.auth!,
        userAgent: navigator.userAgent,
      });
      if (res.ok) setState("on");
      else {
        // Roll back the browser-side subscription so the UI stays
        // consistent with the server's view.
        await sub?.unsubscribe().catch(() => {});
        setState("off");
      }
    });
  }

  async function handleUnsubscribe() {
    if (pending) return;
    let endpoint: string | null = null;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      endpoint = sub?.endpoint ?? null;
      if (sub) await sub.unsubscribe();
    } catch {
      // continue — we'll still try to delete the server row if we have it
    }
    if (endpoint) {
      startTransition(async () => {
        await deletePushSubscriptionAction({ endpoint: endpoint! });
        setState("off");
      });
    } else {
      setState("off");
    }
  }

  async function handleTest() {
    if (pending) return;
    startTransition(async () => {
      const res = await sendTestPushAction();
      if (res.ok) setTestSentAt(Date.now());
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "denied" ? (
        <button type="button" disabled className="btn btn-sm">
          Blokeret i browser
        </button>
      ) : state === "on" ? (
        <>
          <button
            type="button"
            onClick={handleUnsubscribe}
            disabled={pending}
            className="btn btn-sm"
          >
            {pending ? "…" : "Slå fra"}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={pending || noKey}
            className="btn btn-sm btn-ghost"
            title={noKey ? "VAPID keys mangler" : "Send testbesked"}
          >
            Test
          </button>
          <span className="text-[10px] font-mono text-fg-faint">
            {testSentAt
              ? `Sendt ${secondsAgo(testSentAt)}s siden`
              : "Daglig påmindelse · 08:00"}
          </span>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={handleSubscribe}
            disabled={pending || noKey || state === "loading"}
            className="btn btn-primary btn-sm"
            title={noKey ? "VAPID keys mangler — kontakt admin" : undefined}
          >
            {pending
              ? "Tilmelder…"
              : state === "loading"
              ? "…"
              : "Slå påmindelser til"}
          </button>
          {noKey ? (
            <span className="text-[10px] font-mono text-fg-faint">
              VAPID ikke konfigureret
            </span>
          ) : null}
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * VAPID base64url → Uint8Array (required shape for applicationServerKey)
 * ---------------------------------------------------------------- */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Allocate a real ArrayBuffer (not SharedArrayBuffer) so the
  // resulting Uint8Array satisfies the BufferSource contract for
  // PushManager.subscribe's applicationServerKey under TS strict.
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return view;
}

function secondsAgo(ts: number): number {
  return Math.max(0, Math.round((Date.now() - ts) / 1000));
}
