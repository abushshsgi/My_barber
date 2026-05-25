import React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import { getRouter } from "./router";
import { initNativeShell } from "./lib/native-shell";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

void initNativeShell();

createRoot(root).render(
  <React.StrictMode>
    <RouterProvider router={getRouter()} />
  </React.StrictMode>,
);

