// service-worker.js

const CACHE_NAME = 'encuentra-v1';
const urlsToCache = [
  './', // Cache the root (index.html)
  './index.html', // If your main page is index.html
  './manifest.json', // Add the manifest here to cache it too
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  // Ensure icon paths are also relative if they are in subfolders
  './images/icons/icon-72x72.png',
  './images/icons/icon-96x96.png',
  './images/icons/icon-128x128.png',
  './images/icons/icon-144x144.png',
  './images/icons/icon-152x152.png',
  './images/icons/icon-192x192.png',
  './images/icons/icon-384x384.png',
  './images/icons/icon-512x512.png',
  // Do NOT include products.js or categories.js here,
  // as we want them to always be fetched from the network.
];

// 'install' event: Fired when the Service Worker is installed.
// Here we cache essential static resources.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache Opened');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Service Worker: Error caching some URLs', error);
          // This error might indicate that a URL in urlsToCache does not exist or is not accessible.
          // Double-check each path in urlsToCache.
        });
      })
  );
});

// 'activate' event: Fired when the Service Worker is activated.
// Here we clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Ensure the Service Worker takes control of all open pages
  return self.clients.claim();
});

// 'fetch' event: Fired every time the browser makes a request.
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Strategy for products.js and categories.js: Network First
  // This ensures that the latest version is always attempted to be fetched.
  if (requestUrl.pathname.endsWith('/products.js') || requestUrl.pathname.endsWith('/categories.js')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // If the network response is successful, return it.
          // We are explicitly NOT caching these files here,
          // so they are always fresh from the network.
          return networkResponse;
        })
        .catch(() => {
          // If the network fails, try to serve from the cache as a fallback (Stale-While-Revalidate fallback)
          console.log('Service Worker: Network failed for', requestUrl.pathname, 'serving from cache if available.');
          return caches.match(event.request);
        })
    );
    return; // Important: Stop processing this fetch event here for these specific URLs
  }

  // Default strategy for other resources (Cache First, then Network Fallback)
  // For static resources that don't change often.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // If the resource is in the cache, return it.
        if (response) {
          return response;
        }
        // If not in cache, try to get it from the network.
        return fetch(event.request)
          .then((networkResponse) => {
            // Clone the network response because a response stream can only be consumed once
            const clonedResponse = networkResponse.clone();
            // Open the cache and save the new response
            caches.open(CACHE_NAME).then((cache) => {
              // Do not cache POST requests or non-file extensions
              if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
                  cache.put(event.request, clonedResponse);
              }
            });
            return networkResponse;
          })
          .catch(() => {
            // This is triggered if the network fails and the resource was not in cache
            console.log('Service Worker: Fetch failed for:', event.request.url);
            // You can return an error page or an offline resource if desired
            // return caches.match('/offline.html'); // Example: if you have an offline.html page
          });
      })
  );
});