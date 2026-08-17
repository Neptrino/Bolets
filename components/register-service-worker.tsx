"use client";

import { useEffect, useState } from "react";

/**
 * Registers the offline worker and, when a new one is ready, offers the reload
 * instead of taking it. Someone reading a map in the forest should never have
 * the page replaced under them; the update waits until they ask for it.
 */
export function RegisterServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // In development the worker's shell/asset caches serve stale builds and
    // mask every edit; the offline mode only matters on the deployed site.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined);
      return;
    }
    let cancelled = false;

    const watch = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) setWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          // A worker that reaches "installed" while another controls the page
          // is a pending update rather than the first install.
          if (installing.state === "installed" && navigator.serviceWorker.controller)
            setWaiting(installing);
        });
      });
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        if (!cancelled) watch(registration);
      })
      .catch((error: unknown) => {
        console.warn("El mode fora de línia no s'ha pogut activar", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!waiting) return null;

  return (
    <div role="status" className="update-banner">
      <span>Hi ha una versió nova del mapa.</span>
      <button
        type="button"
        onClick={() => {
          // The worker takes over and reloads the page through controllerchange.
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            () => window.location.reload(),
            { once: true },
          );
          waiting.postMessage({ type: "SKIP_WAITING" });
          setWaiting(null);
        }}
      >
        Actualitza
      </button>
    </div>
  );
}
