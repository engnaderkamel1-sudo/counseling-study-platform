// Service Worker for Counseling Study Platform PWA
const CACHE_NAME = 'counseling-pwa-v1792418255';

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

// استلام ومزامنة قائمة المحاضرات من التطبيق لتخزينها في الكاش المخصص للتنبيهات
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SYNC_ZOOM_LECTURES') {
    const lectures = event.data.lectures;
    if (Array.isArray(lectures)) {
      caches.open('counsel-zoom-cache').then((cache) => {
        cache.put('/zoom-lectures.json', new Response(JSON.stringify(lectures), {
          headers: { 'Content-Type': 'application/json' }
        })).catch(() => {});
      }).catch(() => {});
    }
  }
});

// فحص دوري في خلفية الجهاز لتذكيرات زوم (Periodic Background Sync في المتصفحات المدعومة)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-zoom-reminders') {
    event.waitUntil(checkBackgroundZoomReminders());
  }
});

// استلام الإشعارات المباشرة من السيرفر (Push Notifications)
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'تنبيه منصة المشورة', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'منصة دراسة المشورة';
  const options = {
    body: data.body || 'لديك إشعار جديد في منصة دراسة المشورة.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [250, 100, 250],
    tag: data.tag || 'counsel_push_' + Date.now(),
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

async function checkBackgroundZoomReminders() {
  try {
    const cache = await caches.open('counsel-zoom-cache');
    const resp = await cache.match('/zoom-lectures.json');
    if (!resp) return;
    const lectures = await resp.json();
    if (!Array.isArray(lectures) || lectures.length === 0) return;

    const now = Date.now();
    for (let lec of lectures) {
      if (!lec || !lec.zoomUrl || !lec.date) continue;
      // فحص سريع لتاريخ ووقت المحاضرة
      const dParts = String(lec.date).split(/[-/]/);
      if (dParts.length !== 3) continue;
      const yr = parseInt(dParts[0].length === 4 ? dParts[0] : dParts[2], 10);
      const mo = parseInt(dParts[1], 10) - 1;
      const da = parseInt(dParts[0].length === 4 ? dParts[2] : dParts[0], 10);
      const target = new Date(yr, mo, da, 18, 0, 0); // 6:00 PM default
      const diffMins = Math.round((target.getTime() - now) / 60000);

      if (diffMins >= -10 && diffMins <= 10) {
        await self.registration.showNotification("🚀 قاعة زووم مفتوحة الآن: " + (lec.title || ""), {
          body: "بدأت المحاضرة الآن! اضغط هنا للدخول المباشر إلى زووم.",
          icon: "icon-192.png",
          badge: "icon-192.png",
          vibrate: [250, 100, 250],
          tag: "bg_zoom_open_" + lec.id,
          data: { url: lec.zoomUrl }
        });
        break;
      }
    }
  } catch (err) {}
}
