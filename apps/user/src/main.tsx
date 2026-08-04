import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { NativeBootSplash } from "./components/native/NativeBootSplash";
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
void initNativeShell();
installChunkReloadGuard();

// Old PWA SW Capacitor WebView da qotishga olib keladi — o‘chirish.
if (isNativeApp() && "serviceWorker" in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister();
  });
}

const router = getRouter();
attachNativeAppBridge(router);

function MobileRoot() {
  const [splashDone, setSplashDone] = useState(() => !isNativeApp());

  return (
    <>
      {!splashDone ? <NativeBootSplash onFinished={() => setSplashDone(true)} /> : null}
      <div
        className={splashDone ? "native-app-shell" : "native-app-shell native-app-shell--booting"}
        aria-hidden={!splashDone}
      >
        <RouterProvider router={router} />
      </div>
    </>
  );
}

createRoot(root).render(
  <React.StrictMode>
    <MobileRoot />
  </React.StrictMode>,
);
