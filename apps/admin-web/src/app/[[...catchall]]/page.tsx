"use client";

import { RouterProvider } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getRouter } from "@/router";

export default function AppPage() {
  const [mounted, setMounted] = useState(false);
  const router = useMemo(() => getRouter(), []);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return <RouterProvider router={router} />;
}

