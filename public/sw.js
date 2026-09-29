// Service Worker for 不動産販売・原価管理システム (PWA Offline-First)
const CACHE_NAME = 'real-estate-cost-manager-v3';

// Service Workerの登録スコープに基づいて相対アセットURLを動的生成（GitHub Pagesサブパス完全対応）
function getStaticAssets() {
  const scope = self.registration ? self.registration.scope : self.location.href;
  return [
    scope,
    new URL('index.html', scope).href,
    new URL('manifest.json', scope).href,
    new URL('icon.svg', scope).href,
    new URL('pwa-192x192.png', scope).href,
    new URL('pwa-512x512.png', scope).href,
    new URL('apple-touch-icon.png', scope).href,
  ];
}

// Install Event - Pre-cache critical core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const assets = getStaticAssets();
      for (const asset of assets) {
        try {
          const response = await fetch(asset, { cache: 'no-cache' });
          if (response && response.status === 200) {
            const text = await response.clone().text();
            // Ensure we do not cache the "Please wait while your application starts" proxy page
            if (!text.includes('Please wait while your application starts')) {
              await cache.put(asset, response);
            }
          }
        } catch (e) {
          console.warn('[PWA SW] Pre-cache failed for', asset, e);
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Helper: Check if response is valid (not an error and not the AI Studio start screen)
async function isValidAppResponse(response, isHtml = false) {
  if (!response || response.status !== 200) return false;
  if (isHtml) {
    try {
      const clone = response.clone();
      const text = await clone.text();
      // If it contains proxy wait screen, it is not our app
      if (text.includes('Please wait while your application starts')) {
        return false;
      }
      // Must contain root or standard html
      if (!text.includes('id="root"') && !text.includes('<!doctype') && !text.includes('<!DOCTYPE')) {
        return false;
      }
    } catch (err) {
      return false;
    }
  }
  return true;
}

// Fetch Event - Cache-First for instant offline startup
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  const scope = self.registration ? self.registration.scope : self.location.href;
  const indexHtmlUrl = new URL('index.html', scope).href;

  // 1. Navigation requests (HTML document / page loads)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedHtml =
          (await cache.match(event.request)) ||
          (await cache.match(indexHtmlUrl)) ||
          (await cache.match(scope));

        // If we have a cached version, serve it IMMEDIATELY so app opens with 0ms delay even if offline
        if (cachedHtml) {
          // In the background, attempt to refresh cache if server is reachable
          fetch(event.request)
            .then(async (networkResponse) => {
              if (await isValidAppResponse(networkResponse, true)) {
                cache.put(event.request, networkResponse.clone());
                cache.put(indexHtmlUrl, networkResponse.clone());
              }
            })
            .catch(() => {});
          return cachedHtml;
        }

        // If not in cache yet, try network
        try {
          const networkResponse = await fetch(event.request);
          if (await isValidAppResponse(networkResponse, true)) {
            cache.put(event.request, networkResponse.clone());
            cache.put(indexHtmlUrl, networkResponse.clone());
            return networkResponse;
          }
        } catch (err) {
          // Network failed
        }

        // Fallback to whatever cache we have
        return (
          cachedHtml ||
          new Response('オフラインです。一度オンラインで起動してください。', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          })
        );
      })()
    );
    return;
  }

  // 2. Static Assets (JS, CSS, SVGs, Fonts, Images, JSON)
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);

      // If cached, return immediately
      if (cachedResponse) {
        // Background revalidation
        fetch(event.request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const contentType = networkResponse.headers.get('content-type') || '';
              // Make sure we don't cache an HTML proxy error for a .js or .css file
              if (!contentType.includes('text/html') || url.pathname.endsWith('.html')) {
                cache.put(event.request, networkResponse.clone());
              }
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Not cached, fetch from network and cache
      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.status === 200) {
          const contentType = networkResponse.headers.get('content-type') || '';
          if (!contentType.includes('text/html') || url.pathname.endsWith('.html')) {
            cache.put(event.request, networkResponse.clone());
          }
        }
        return networkResponse;
      } catch (err) {
        // If offline and not in cache
        return cachedResponse || new Response('Asset unavailable offline', { status: 503 });
      }
    })()
  );
});
