/* Offline: cache every file on install, serve from cache first. Bump VERSION whenever any file changes. */
const VERSION = "yy-2026-10-16-1";
const FILES = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/core.js", "js/paint.js", "js/rose.js", "js/story.js", "js/cities.js", "js/map.js", "js/main.js",
  "data/config.json", "data/stops.json", "data/story.json", "data/wins.json", "data/letters.json", "data/notes.json", "data/films.json",
  "js/vendor/three.module.min.js", "js/film3d/index.js", "js/film3d/engine.js", "js/film3d/film.js", "js/film3d/kit.js", "js/film3d/people.js", "js/film3d/cities/istanbul.js",
  "js/film3d/characters.js", "js/film3d/scenes/istanbul-bench.js", "js/vendor/GLTFLoader.js", "js/vendor/BufferGeometryUtils.js",
  "models/william.glb", "models/nesrin.glb", "models/istanbul-bench-poster.jpg",
  "videos/istanbul-bench.mp4", "videos/istanbul-bench-poster.jpg",
  "fonts/cormorant-normal-latin.woff2", "fonts/cormorant-normal-latin-ext.woff2",
  "fonts/cormorant-italic-latin.woff2", "fonts/cormorant-italic-latin-ext.woff2",
  "fonts/inter-normal-latin.woff2", "fonts/inter-normal-latin-ext.woff2",
  "icons/icon.svg", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png",
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Video elements ask for byte ranges. Serving a whole 200 breaks playback on Safari, so cut a 206 from the cached file.
async function ranged(req) {
  const hit = await caches.match(req, { ignoreSearch: true });
  if (!hit) return fetch(req);
  const buf = await hit.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(req.headers.get("range") || "");
  const start = m && m[1] ? +m[1] : 0, end = m && m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { "Content-Type": hit.headers.get("Content-Type") || "video/mp4", "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`, "Content-Length": String(end - start + 1) } });
}
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (e.request.headers.has("range")) { e.respondWith(ranged(e.request)); return; }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  })));
});
