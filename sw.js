// Service Worker for Counseling Study Platform PWA
const CACHE_NAME = 'counseling-pwa-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية Network-First لواجهة التطبيق لحمايته من الشاشة البيضاء عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // لا نعترض طلبات الـ API أو الصوت أو قواعد بيانات فايربيز لضمان استمرار البث المباشر والمزامنة اللحظية
  if (
    req.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('hf.space')
  ) {
    return;
  }

  // لطلبات صفحات التطبيق وموارده الأساسية: الأولوية دائماً للإنترنت أولاً
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('.js') || url.pathname.endsWith('.png')) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // في حال انقطاع الإنترنت التام: نفتح النسخة المحفوظة أوفلاين
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (req.mode === 'navigate') {
              return caches.match('./index.html').then((fallback) => {
                return fallback || caches.match('/index.html');
              });
            }
          });
        })
    );
  }
});

// التعامل مع النقر على إشعار النظام
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url && 'focus' in client) {
          if (urlToOpen && urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
