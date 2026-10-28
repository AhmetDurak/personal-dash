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
  const path = event.notification.data?.url || '/home'
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(w => w.url.startsWith(self.location.origin))
    if (existing) {
      // The running app routes client-side (useReminderNotifications listens for this);
      // WindowClient.navigate() is unreliable in installed iOS web apps.
      await existing.focus()
      existing.postMessage({ type: 'navigate', url: path })
      return
    }
    return self.clients.openWindow(new URL(path, self.location.origin).href)
  })())
})
