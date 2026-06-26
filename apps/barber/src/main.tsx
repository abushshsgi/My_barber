import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { CLIENT_BOOT_SCRIPT } from "./lib/client-boot-script";
import { installChunkReloadGuard } from "./lib/chunk-reload";
import { initNativeShell } from "./lib/native-shell";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

try {
  // eslint-disable-next-line no-new-func
  new Function(CLIENT_BOOT_SCRIPT)();
} catch {
  /* ignore */
}

void initNativeShell();
installChunkReloadGuard();

createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={getRouter()} />
  </React.StrictMode>,
);
