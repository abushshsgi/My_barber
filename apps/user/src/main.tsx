import React, { useEffect, useRef, useState } from "react";
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

const BOOT_FAILSAFE_MS = 3200;

function MobileRoot() {
  const native = isNativeApp();
  const [splashDone, setSplashDone] = useState(() => !native);
  const finishedRef = useRef(false);

  const finishSplash = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSplashDone(true);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.nativeBoot = "done";
    }
  };

  useEffect(() => {
    if (!native || splashDone) return;
    const t = window.setTimeout(finishSplash, BOOT_FAILSAFE_MS);
    return () => window.clearTimeout(t);
  }, [native, splashDone]);

  return (
    <>
      {!splashDone ? <NativeBootSplash onFinished={finishSplash} /> : null}
      <div className="native-app-shell">
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
