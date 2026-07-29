// Offline support (A6). Install/update polish and the widget land later.
//
// Strategy matters more than it looks. A blanket cache-first served a stale index.html
// forever: the cached HTML points at old content-hashed bundles which are also cached, so
// a redeploy could never reach anyone and there'd be no way to fix it remotely. For a
// build being handed to testers, that is the worst available failure mode.
//
//   navigations   → network-first, cached shell as fallback (newest app, still works offline)
//   everything else → cache-first (Vite asset names are content-hashed, so a hit is always
//                     correct and a new build simply misses and fetches)

const CACHE = 'tamati-v2'
const SHELL = './'

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(caches.open(CACHE).then((c) => c.add(SHELL)))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches
            .open(CACHE)
            .then((c) => c.put(SHELL, copy))
            .catch(() => {})
          return res
        })
        .catch(() => caches.match(SHELL).then((hit) => hit ?? Response.error())),
    )
    return
  }

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          const copy = res.clone()
          caches
            .open(CACHE)
            .then((c) => c.put(req, copy))
            .catch(() => {})
          return res
        }),
    ),
  )
})
