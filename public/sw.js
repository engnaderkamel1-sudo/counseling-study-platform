// Service Worker for Counseling Study Platform PWA
const CACHE_NAME = 'counseling-pwa-v4';

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
            try {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(req, responseClone).catch(() => {});
              }).catch(() => {});
            } catch (cloneErr) {}
          }
          return networkResponse;
        })
        .catch(async () => {
          // في حال انقطاع الإنترنت التام: نفتح النسخة المحفوظة أوفلاين
          try {
            const cachedResponse = await caches.match(req);
            if (cachedResponse) return cachedResponse;
            if (req.mode === 'navigate') {
              const fallback = await caches.match('./index.html') || await caches.match('/index.html');
              if (fallback) return fallback;
            }
          } catch (matchErr) {}
          return new Response('Network offline', { status: 503, statusText: 'Offline' });
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
