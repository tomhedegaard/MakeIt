"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  savePushSubscriptionAction,
  deletePushSubscriptionAction,
} from "@/app/(app)/push/actions";
import { isNativeApp, getNativePlatform } from "@/lib/platform";

const ENDPOINT_KEY = "mi_native_push_endpoint";

/**
 * Push toggle for the native shells (APP_STORE_PLAN Fase 3).
 *
 * The web PushToggle self-removes in the shells (WKWebView has no
 * PushManager); this component is its native sibling. It talks to
 * @capacitor/push-notifications through the injected runtime
 * (window.Capacitor.Plugins) — with server.url-loaded apps the plugin
 * JS is injected by the shell, not bundled by Next.
 *
 * Tokens land in the same push_subscriptions table with
 * platform=ios/android and endpoint "native:<platform>:<token>" —
 * never an https URL, so the web-push sender skips them. Server-side
 * APNs/FCM delivery is wired in a later fase (needs APNs key +
 * Firebase service account).
 */

type PermissionState = { receive: "granted" | "denied" | "prompt" | "prompt-with-rationale" };
type PushPlugin = {
  checkPermissions: () => Promise<PermissionState>;
  requestPermissions: () => Promise<PermissionState>;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
  addListener: (
    event: "registration" | "registrationError",
    cb: (data: { value?: string; error?: string }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
};

function plugin(): PushPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = (window as {
    Capacitor?: { Plugins?: { PushNotifications?: PushPlugin } };
  }).Capacitor;
  return cap?.Plugins?.PushNotifications ?? null;
}

type State = "hidden" | "loading" | "denied" | "off" | "on";

export default function NativePushToggle() {
  const t = useTranslations("Push");
  const [state, setState] = useState<State>("hidden");
  const [pending, startTransition] = useTransition();
  const listeners = useRef<Array<{ remove: () => Promise<void> }>>([]);

  useEffect(() => {
    if (!isNativeApp() || !plugin()) return;
    const timer = window.setTimeout(async () => {
      try {
        const perm = await plugin()!.checkPermissions();
        if (perm.receive === "denied") {
          setState("denied");
        } else if (
          perm.receive === "granted" &&
          localStorage.getItem(ENDPOINT_KEY)
        ) {
          setState("on");
        } else {
          setState("off");
        }
      } catch {
        setState("off");
      }
    }, 0);
    const current = listeners.current;
    return () => {
      window.clearTimeout(timer);
      for (const l of current) void l.remove().catch(() => {});
    };
  }, []);

  if (state === "hidden") return null;

  async function handleEnable() {
    const p = plugin();
    if (!p || pending) return;

    const perm = await p.requestPermissions();
    if (perm.receive !== "granted") {
      setState(perm.receive === "denied" ? "denied" : "off");
      return;
    }

    const reg = await p.addListener("registration", (token) => {
      if (!token.value) return;
      const platform = getNativePlatform() ?? "ios";
      const endpoint = `native:${platform}:${token.value}`;
      startTransition(async () => {
        const res = await savePushSubscriptionAction({
          endpoint,
          // Web Push-nøglefelter er meningsløse for APNs/FCM-tokens;
          // tomme strenge holder skemaet (NOT NULL) uden migration.
          p256dh: "",
          auth: "",
          userAgent: navigator.userAgent,
          platform,
        });
        if (res.ok) {
          localStorage.setItem(ENDPOINT_KEY, endpoint);
          setState("on");
        }
      });
    });
    listeners.current.push(reg);

    const err = await p.addListener("registrationError", (e) => {
      console.warn("[push] native registration failed:", e.error);
    });
    listeners.current.push(err);

    await p.register();
  }

  async function handleDisable() {
    const p = plugin();
    if (!p || pending) return;
    await p.unregister().catch(() => {});
    const endpoint = localStorage.getItem(ENDPOINT_KEY);
    localStorage.removeItem(ENDPOINT_KEY);
    if (endpoint) {
      startTransition(async () => {
        await deletePushSubscriptionAction({ endpoint });
        setState("off");
      });
    } else {
      setState("off");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "denied" ? (
        <button type="button" disabled className="btn btn-sm">
          {t("blocked")}
        </button>
      ) : state === "on" ? (
        <button
          type="button"
          onClick={handleDisable}
          disabled={pending}
          className="btn btn-sm"
        >
          {pending ? t("ellipsis") : t("turnOff")}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleEnable}
          disabled={pending || state === "loading"}
          className="btn btn-primary btn-sm"
        >
          {pending ? t("subscribing") : t("turnOn")}
        </button>
      )}
    </div>
  );
}
