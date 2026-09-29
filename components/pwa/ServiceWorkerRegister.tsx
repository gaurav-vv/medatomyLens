"use client";

import { withBase } from "@/lib/basePath";
import { useEffect } from "react";

/** Registers /sw.js in production builds only (dev caching causes stale code). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(withBase("/sw.js")).catch(() => {
      // Offline support is optional; the app keeps working without it.
      console.warn("Service worker registration failed.");
    });
  }, []);
  return null;
}
