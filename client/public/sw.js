// Service worker: receives Web Push messages and opens the right page on tap.
// Deliberately no caching/offline logic — the app always loads from the network.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {}
  event.waitUntil(self.registration.showNotification(data.title || 'Personal Dashboard', {
    body: data.body || '',
    tag: data.tag,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/home' },
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/home', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(w => w.url.startsWith(self.location.origin))
    if (existing) {
      await existing.focus()
      return existing.navigate(url)
    }
    return self.clients.openWindow(url)
  })())
})
