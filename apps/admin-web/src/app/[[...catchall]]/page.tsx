"use client";

import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";

const router = getRouter();

export default function AppPage() {
  return <RouterProvider router={router} />;
}

