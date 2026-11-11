/* ============================================================
   عملیات سایه — sw.js
   Service Worker برای اجرای کاملاً آفلاین بازی
   ============================================================ */
var CACHE_NAME = 'shadow-operation-v1';

var ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/game.css',
  './css/mobile.css',
  './js/lib/three.min.js',
  './js/storage.js',
  './js/audio.js',
  './js/weapons.js',
  './js/missions.js',
  './js/enemies.js',
  './js/player.js',
  './js/controls.js',
  './js/game-engine.js',
  './js/ui.js',
  './js/main.js',
  './assets/images/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        // ذخیره در کش برای استفاده آفلاین بعدی
        if (response && response.status === 200 && event.request.method === 'GET') {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        // در صورت نبود اینترنت، صفحه اصلی را برگردان
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
