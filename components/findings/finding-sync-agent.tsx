"use client";

import { useEffect } from "react";
import { syncFindingOutbox } from "@/src/lib/findings/sync-client";

export function FindingSyncAgent() {
  useEffect(() => {
    const sync = () => void syncFindingOutbox();
    sync();
    window.addEventListener("online", sync);
    const onVisibility = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
