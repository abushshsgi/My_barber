import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { installChunkReloadGuard } from "./lib/chunk-reload";
import { applyNativeAppDocumentFlag, isNativeApp } from "./lib/native-app";
import { attachNativeAppBridge, initNativeShell } from "./lib/native-shell";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

applyNativeAppDocumentFlag();
installChunkReloadGuard();

// Old PWA SW Capacitor WebView da qotishga olib keladi — o‘chirish.
if (isNativeApp() && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
}

const router = getRouter();
attachNativeAppBridge(router);

/** Native splash yashirish + chrome — UI mount bilan parallel. */
void initNativeShell().finally(() => {
  document.documentElement.dataset.nativeBoot = "done";
  document.documentElement.style.backgroundColor = "";
  document.body.style.backgroundColor = "";
});

createRoot(root).render(
  <React.StrictMode>
    <div className="native-app-shell min-h-[100dvh] bg-background text-foreground">
      <RouterProvider router={router} />
    </div>
  </React.StrictMode>,
);
