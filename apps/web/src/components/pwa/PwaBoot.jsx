"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";
const RELOAD_FLAG = "storvex_sw_reloaded_once_v1";

function canUseServiceWorker() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;

  return window.location.protocol === "https:";
}

async function clearStorvexRuntimeCaches() {
  if (typeof window === "undefined") return;
  if (!("caches" in window)) return;

  const keys = await caches.keys();

  await Promise.all(
    keys
      .filter((key) => key.startsWith("storvex-web-"))
      .map((key) => caches.delete(key)),
  );
}

async function unregisterLocalServiceWorkers() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "[::1]";

  if (!isLocalhost && process.env.NODE_ENV === "production") return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(registrations.map((registration) => registration.unregister()));
    await clearStorvexRuntimeCaches();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Storvex service worker cleanup failed:", error);
    }
  }
}

function askWaitingWorkerToActivate(registration) {
  if (!registration?.waiting) return;

  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}

export default function PwaBoot() {
  useEffect(() => {
    unregisterLocalServiceWorkers();

    if (!canUseServiceWorker()) return;

    let cancelled = false;
    let refreshing = false;

    function handleControllerChange() {
      if (refreshing) return;

      refreshing = true;

      const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
      if (alreadyReloaded) return;

      sessionStorage.setItem(RELOAD_FLAG, "1");
      window.location.reload();
    }

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, {
          scope: "/",
          updateViaCache: "none",
        });

        if (cancelled) return;

        askWaitingWorkerToActivate(registration);

        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;

          if (!installingWorker) return;

          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
              askWaitingWorkerToActivate(registration);
            }
          });
        });

        await registration.update().catch(() => undefined);
      } catch (error) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Storvex service worker registration failed:", error);
        }
      }
    }

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    if (document.readyState === "complete") {
      registerServiceWorker();
    } else {
      window.addEventListener("load", registerServiceWorker, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", registerServiceWorker);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  return null;
}
