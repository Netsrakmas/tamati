// Replaced with a content-hashed release ID and complete asset list by Vite at build.
const CACHE = 'tamati-__RELEASE__'
const ASSETS = __ASSETS__
const SHELL = new URL('./', self.location).href
self.addEventListener('install', event => {
  // Let an existing worker finish serving its open tabs. Forcing skipWaiting here
  // can activate between an old HTML response and its old bundle requests.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)))
})
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tamati-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})
self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  // Every navigation uses this release's shell and bundles together. The next release
  // activates after the previous app tabs close; never mix two app versions.
  event.respondWith(caches.open(CACHE).then(async cache => {
    const key = request.mode === 'navigate' ? SHELL : request
    const cached = await cache.match(key)
    if (cached) return cached
    return fetch(request)
  }))
})
