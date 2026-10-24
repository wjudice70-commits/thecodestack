/* Offline: cache every file on install, serve from cache first (the bench clips stream). Bump VERSION whenever any file changes. */
const VERSION = "yy-2026-10-24-2";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/core.js", "js/paint.js", "js/atmos.js", "js/lanterns.js", "js/rose.js", "js/story.js", "js/story-rose.js", "js/cities.js", "js/map.js", "js/main.js",
  "data/config.json", "data/stops.json", "data/story.json", "data/wins.json", "data/letters.json", "data/notes.json", "data/films.json",
  "js/storybook/index.js", "js/storybook/book.js", "js/storybook/anime.js", "js/storybook/scene.js", "js/storybook/wash.js", "js/storybook/kit.js", "js/storybook/cities.js", "js/storybook/figure.js",
  "fonts/cormorant-normal-latin.woff2", "fonts/cormorant-normal-latin-ext.woff2",
  "fonts/cormorant-italic-latin.woff2", "fonts/cormorant-italic-latin-ext.woff2",
  "fonts/inter-normal-latin.woff2", "fonts/inter-normal-latin-ext.woff2",
  "icons/icon.svg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // The bench clips stream straight from the network: video needs range requests, which a cache-first copy would break.
  if (/\.mp4$/.test(new URL(e.request.url).pathname)) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
