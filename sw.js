const CACHE_NAME = 'lime-chat-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './app.js',
  './style.css',
  './image/icon.png',
  './image/bg.png',
  './image/favicon.png',
];

// インストール時にアセットをキャッシュ
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// リクエスト発生時にキャッシュがあればそれを返す（ネットワーク優先）
self.addEventListener('fetch', (event) => {
  // GET 以外のリクエストおよび外部ドメインのリクエストは除外
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // 正常なレスポンスのみキャッシュを最新化
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === 'basic' || networkResponse.type === 'cors')
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // キャッシュからの復元
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }

        // ページ遷移時のフォールバック処理
        if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
          const indexCache = await caches.match('./index.html') || await caches.match('./');
          if (indexCache) {
            return indexCache;
          }
        }
      })
  );
});

// 古いキャッシュの削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME)
              .map((key) => caches.delete(key))
        );
      }),
      self.clients.claim()
    ])
  );
});
