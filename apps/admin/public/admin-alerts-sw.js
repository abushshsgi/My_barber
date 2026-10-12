self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification.data && event.notification.data.href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const client = clients[0];
      if (!client) return undefined;
      client.postMessage({ type: "admin-payment-open", href });
      return client.focus();
    }),
  );
});
