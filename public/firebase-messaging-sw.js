/* Polywatch Firebase Web Messaging service worker. */

const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get('apiKey') || '',
  authDomain: params.get('authDomain') || '',
  projectId: params.get('projectId') || '',
  messagingSenderId: params.get('messagingSenderId') || '',
  appId: params.get('appId') || '',
};

function hasFirebaseConfig(config) {
  return Boolean(
    config.apiKey &&
      config.authDomain &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId
  );
}

function notificationUrl(data = {}) {
  if (data.url) return data.url;
  if (data.tradeId) return `/trade/${encodeURIComponent(data.tradeId)}`;
  return '/';
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = notificationUrl(event.notification.data || {});
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const absoluteUrl = new URL(url, self.location.origin).href;
      for (const client of clientList) {
        if ('focus' in client && client.url === absoluteUrl) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(absoluteUrl);
      return undefined;
    })
  );
});

if (hasFirebaseConfig(firebaseConfig)) {
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const notification = payload.notification || {};
    const title = notification.title || 'Polywatch whale alert';
    const options = {
      body: notification.body || 'A tracked whale trade matched your alert settings.',
      icon: '/assets/polywatch-icon.png',
      badge: '/assets/polywatch-icon.png',
      tag: data.tradeId ? `polywatch-whale-${data.tradeId}` : 'polywatch-whale-alert',
      data: {
        ...data,
        url: notificationUrl(data),
      },
    };

    self.registration.showNotification(title, options);
  });
}
