const CACHE = "lubapiano-v0-1-5-1";
const CACHE_PREFIX = "lubapiano-";
const ASSETS = ["./", "./index.html", "./style.css", "./app.js", "./manifest.webmanifest", "./icons/lubapiano.svg", "./icons/lubapiano-192.png", "./icons/lubapiano-512.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  // Nesahat na cache jiných aplikací, které sdílejí localhost a port.
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  const assetPath = requestUrl.pathname;
  const localPaths = ASSETS.map((path) => new URL(path, self.registration.scope).pathname);
  if (!localPaths.includes(assetPath)) return;
  // Online ber vždy aktuální soubory; offline použij lokální kopii.
  event.respondWith(fetch(event.request, {cache: "no-store"})
    .then((response) => response.ok ? response : caches.match(event.request, {ignoreSearch: true}).then((cached) => cached || response))
    .catch(() => caches.match(event.request, {ignoreSearch: true})));
});
