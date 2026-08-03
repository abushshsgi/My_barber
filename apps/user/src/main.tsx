import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { installChunkReloadGuard } from "./lib/chunk-reload";
import { attachNativeAppBridge, initNativeShell } from "./lib/native-shell";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

void initNativeShell();
installChunkReloadGuard();

const router = getRouter();
attachNativeAppBridge(router);

createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
