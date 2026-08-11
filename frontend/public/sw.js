/* MaintainIQ SW – network-first; never serve HTML for JS/CSS */
const CACHE = "maintainiq-v3";
const PRECACHE = ["/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;

  // Pages: network-first (fresh index.html + correct asset hashes)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached =
            (await caches.match("/index.html")) || (await caches.match("/"));
          return (
            cached ||
            new Response(
              "<!doctype html><title>Offline</title><h1>Offline</h1><p>Reconnect and refresh.</p>",
              {
                status: 503,
                statusText: "Service Unavailable",
                headers: { "Content-Type": "text/html; charset=utf-8" },
              },
            )
          );
        }),
    );
    return;
  }

  const isAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".mjs");

  // JS/CSS: network-first — NEVER fall back to HTML
  if (isAsset) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(event.request, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return (
            cached ||
            new Response("Asset unavailable (offline)", {
              status: 503,
              statusText: "Service Unavailable",
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }),
    );
    return;
  }

  // Other same-origin GET: cache then network
  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      try {
        const res = await fetch(event.request);
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return res;
      } catch {
        return new Response("Resource unavailable (offline)", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
