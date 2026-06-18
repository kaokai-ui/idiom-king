const appSlug = new URL(self.registration.scope).pathname.split('/').filter(Boolean).pop() ?? '';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if (appSlug) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((cacheKey) => cacheKey.toLowerCase().includes(appSlug.toLowerCase()))
          .map((cacheKey) => caches.delete(cacheKey)),
      );
    }

    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map((client) => client.navigate(client.url)));
  })());
});
