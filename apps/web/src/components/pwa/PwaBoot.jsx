"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

function canUseServiceWorker() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  return window.location.protocol === "https:" || isLocalhost;
}

export default function PwaBoot() {
  useEffect(() => {
    if (!canUseServiceWorker()) return;

    let cancelled = false;

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;

        registration.update().catch(() => undefined);

        navigator.serviceWorker.ready.catch(() => undefined);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Storvex service worker registration failed:", error);
        }
      }
    }

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerServiceWorker);
    };
  }, []);

  return null;
}