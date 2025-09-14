// Service Worker para notificações push
const CACHE_VERSION = 'v' + Date.now(); // Auto-update cache version

// Force cache update on install
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_VERSION) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'view') {
    // Abrir URL específica
    const urlToOpen = event.notification.data.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll().then(function(clientList) {
        for (let i = 0; i < clientList.length; i++) {
          let client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (event.action === 'acknowledge') {
    // Reconhecer alerta via API
    const alertId = event.notification.data.alertId;
    if (alertId) {
      fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
    }
  }
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Nova notificação',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: true
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'LuxeFlow', options)
  );
});