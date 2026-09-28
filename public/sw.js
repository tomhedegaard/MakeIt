/* MakeIt // HQ — service worker
 *
 * Two responsibilities (docs/APP_STORE_PLAN.md Fase 1):
 *  1. Web Push — payload contract from src/lib/push.ts:
 *     { title, body, url, tag }. tag dedupes notifications; url is
 *     the click destination.
 *  2. Offline fallback — navigations are network-first; when the
 *     network is gone we serve /offline.html from a versioned cache.
 *     We deliberately cache NOTHING else: the app is SSR and caching
 *     pages/data would risk serving stale auth state.
 */

const VERSION = "v2";
const OFFLINE_CACHE = `mi-offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      await cache.addAll([OFFLINE_URL, "/icons/icon-192.png"]);
      // Activate immediately so members on a hot reload get the new worker.
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older SW versions.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  // Only page navigations get the offline net — assets and data
  // requests pass through untouched.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      const fallback = await cache.match(OFFLINE_URL);
      return (
        fallback ||
        new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
      );
    })
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Plain-text payloads — uncommon but possible.
    try {
      data = { title: event.data.text() || "MakeIt", body: "" };
    } catch {
      data = {};
    }
  }

  const title = data.title || "MakeIt";
  const body = data.body || "";
  const url = data.url || "/";
  const tag = data.tag || undefined;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/icon-192.png",
      data: { url },
      // Renotify when a tag updates so members see something flash
      // even on a tag-deduped notification.
      renotify: Boolean(tag),
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab if one is open at any URL — the SPA
      // navigation is cheaper than a fresh tab.
      for (const client of allClients) {
        if ("focus" in client) {
          await client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return null;
    })()
  );
});

// Bump VERSION above to force-reactivate after a behavior change.
console.log(`[sw] MakeIt service worker ${VERSION} loaded`);
