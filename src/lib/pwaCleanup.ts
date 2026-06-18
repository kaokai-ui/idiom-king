const PWA_CLEANUP_RELOAD_KEY = 'idiom-king:pwa-cleanup-reload';

function getBasePath(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).pathname;
}

function getAppSlug(basePath: string): string {
  const parts = basePath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? '';
}

function isAppScopedRegistration(scope: string, basePath: string): boolean {
  try {
    return new URL(scope).pathname.startsWith(basePath);
  } catch {
    return false;
  }
}

function isAppCache(cacheName: string, appSlug: string): boolean {
  if (!appSlug) return false;
  return cacheName.toLowerCase().includes(appSlug.toLowerCase());
}

export async function cleanupLegacyPwa(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const basePath = getBasePath();
  const appSlug = getAppSlug(basePath);
  let unregisteredAny = false;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      if (!isAppScopedRegistration(registration.scope, basePath)) {
        continue;
      }
      const didUnregister = await registration.unregister();
      unregisteredAny = didUnregister || unregisteredAny;
    }
  } catch (error) {
    console.warn('Failed to inspect service worker registrations.', error);
  }

  if ('caches' in window && appSlug) {
    try {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((cacheKey) => isAppCache(cacheKey, appSlug))
          .map((cacheKey) => caches.delete(cacheKey)),
      );
    } catch (error) {
      console.warn('Failed to clear legacy PWA caches.', error);
    }
  }

  const shouldReload = unregisteredAny && sessionStorage.getItem(PWA_CLEANUP_RELOAD_KEY) !== '1';
  if (shouldReload) {
    sessionStorage.setItem(PWA_CLEANUP_RELOAD_KEY, '1');
    window.location.reload();
    return;
  }

  if (!unregisteredAny) {
    sessionStorage.removeItem(PWA_CLEANUP_RELOAD_KEY);
  }
}
