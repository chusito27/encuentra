const CACHE_NAME = 'encuentra-v1';
const urlsToCache = [
  './', // Ruta relativa al service worker. Es la raíz de tu proyecto.
  './index.html', // Si tu página principal se llama index.html
  //'./main.html', // Si tu página principal se llama main.html
  // Agrega aquí todas las rutas de tus archivos estáticos, asegurándote de que sean relativas a la raíz del Service Worker
  //'./style.css', // Si tienes un archivo CSS externo
  //'./script.js', // Si tienes un archivo JS externo
  './service-worker.js', // El propio Service Worker
  './manifest.json', // Añade el manifest aquí para cachearlo también
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  // Asegúrate de que las rutas de los iconos también sean relativas si están en subcarpetas
  './images/icons/icon-72x72.png',
  './images/icons/icon-96x96.png',
  './images/icons/icon-128x128.png',
  './images/icons/icon-144x144.png',
  './images/icons/icon-152x152.png',
  './images/icons/icon-192x192.png',
  './images/icons/icon-384x384.png',
  './images/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache Abierta');
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Service Worker: Error al cachear algunas URLs', error);
          // Este error puede indicar que una URL en urlsToCache no existe o no es accesible.
          // Revisa bien cada ruta en urlsToCache.
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Si el recurso está en la caché, lo devuelve
        if (response) {
          return response;
        }
        // Si no está en la caché, intenta obtenerlo de la red
        return fetch(event.request)
          .then((networkResponse) => {
            // Clona la respuesta de la red porque un stream de respuesta solo se puede consumir una vez
            const clonedResponse = networkResponse.clone();
            // Abre la caché y guarda la nueva respuesta
            caches.open(CACHE_NAME).then((cache) => {
              // No cachear solicitudes POST o extensiones que no sean de archivo
              if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
                  cache.put(event.request, clonedResponse);
              }
            });
            return networkResponse;
          })
          .catch(() => {
            // Esto se activa si la red falla y el recurso no estaba en caché
            console.log('Service Worker: Fallo en Fetch para:', event.request.url);
            // Puedes devolver una página de error o un recurso offline si lo deseas
            // return caches.match('/offline.html'); // Ejemplo: si tienes una página offline.html
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Elimina cachés antiguas
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});