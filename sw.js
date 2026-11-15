/* Blasters Deck: shows notifications on phones and computers.
   It keeps NO data and caches NOTHING: every page still loads live from the server and the database. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const data = e.notification.data || {};
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const c = all.find(x => new URL(x.url).origin === self.location.origin);
    if (c) { await c.focus(); c.postMessage({ type: 'bd-notification-click', tag: e.notification.tag, data }); }
    else await self.clients.openWindow('./?n=' + encodeURIComponent(e.notification.tag || ''));
  })());
});
/* ready for notifications sent by the server when the app is closed (needs a push service; see the notes) */
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'Blasters Deck', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Blasters Deck', { body: d.body || '', tag: d.tag || 'push', icon: 'icon-192.png', badge: 'icon-192.png', data: d.data || {} }));
});
