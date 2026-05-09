/* MakeIt // HQ — service worker
 *
 * Single-purpose: Web Push. We don't intercept fetches, don't
 * cache assets — the app is a Next.js SSR app and adding cache
 * logic here would risk serving stale auth state. If a future
 * version wants offline support, layer it on top with a versioned
 * cache name.
 *
 * Push payload contract (sent by src/lib/push.ts):
 *   { title, body, url, tag }
 * tag dedupes notifications (e.g. only one daily check-in at a time).
 * url is the destination for the click handler; defaults to '/'.
 */

const VERSION = "v1";

self.addEventListener("install", (event) => {
  // Activate immediately so members on a hot reload get the new
  // worker — there's no cache to migrate.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
      // Icons intentionally omitted until /public/icon-192.png exists.
      // Browsers fall back to their default app icon when missing,
      // which is cleaner than a 404 in DevTools.
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
