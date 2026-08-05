import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { installChunkReloadGuard } from "./lib/chunk-reload";
import { applyNativeAppDocumentFlag } from "./lib/native-app";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

applyNativeAppDocumentFlag();
installChunkReloadGuard();

const router = getRouter();

createRoot(root).render(
  <React.StrictMode>
    <div className="min-h-[100dvh] bg-background text-foreground">
      <RouterProvider router={router} />
    </div>
  </React.StrictMode>,
);
