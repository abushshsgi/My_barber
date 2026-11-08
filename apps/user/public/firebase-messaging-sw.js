/* global importScripts, firebase */
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyCEeksXaBhTC7aI_eODARkkGCnmR6a4tJo",
  authDomain: "mysaloon-4227d.firebaseapp.com",
  projectId: "mysaloon-4227d",
  storageBucket: "mysaloon-4227d.firebasestorage.app",
  messagingSenderId: "1080867624985",
  appId: "1:1080867624985:web:3bc55ba252fdf6aa933288",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || payload?.data?.title || "mysaloon";
  const body = payload?.notification?.body || payload?.data?.body || "";
  const data = payload?.data || {};
  self.registration.showNotification(title, {
    body,
    icon: "/apple-touch-icon.png",
    data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || "/notifications";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(link);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    }),
  );
});
