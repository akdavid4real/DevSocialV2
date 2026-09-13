self.addEventListener('push', (event) => {
  const fallbackPayload = {
    title: 'DevSocial',
    body: 'You have a new notification',
    url: '/notifications',
  };

  const payload = event.data ? event.data.json() : fallbackPayload;
  const title = payload.title || fallbackPayload.title;
  const options = {
    body: payload.body || payload.message || fallbackPayload.body,
    icon: payload.icon || '/window.svg',
    badge: payload.badge || '/window.svg',
    data: {
      url: payload.url || payload.actionUrl || fallbackPayload.url,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client && client.url.endsWith(targetUrl)) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }

      return undefined;
    }),
  );
});
