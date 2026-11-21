// Only public installation assets are cached. Auth, business data and API calls
// always use the network; no offline order writes are queued.
const CACHE = 'sc3d-install-v1';
const ASSETS = ['/offline.html', '/icons/app-192.png', '/icons/app-512.png', '/icons/apple-touch-icon.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith('sc3d-install-') && name !== CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate' && !url.pathname.startsWith('/auth/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Still show a visible notification on Safari. */ }
  event.waitUntil(self.registration.showNotification('SCANDIZZO 3D', {
    body: payload.type === 'test' ? 'As notificações estão funcionando neste aparelho.' : 'Um novo pedido foi cadastrado. Abra o sistema para consultar.',
    icon: '/icons/app-192.png',
    badge: '/icons/app-192.png',
    tag: payload.tag || 'sc3d-pedido',
    data: { url: '/admin#sales' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const target = new URL('/admin#sales', self.location.origin).href;
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
