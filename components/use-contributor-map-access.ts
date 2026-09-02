"use client";

import { useEffect, useState } from "react";
import type { ContributorAccessSummary } from "@/src/lib/contributions";

export type ContributorMapAccess = ContributorAccessSummary & { checked: boolean };

const publicAccess: ContributorMapAccess = {
  checked: false,
  authenticated: false,
  active: false,
  level: "public",
  minimumResolutionM: 2500,
  activeUntil: null,
  oneKmActiveUntil: null,
  fineActiveUntil: null,
  revokedAt: null,
};

let pendingAccess: Promise<ContributorAccessSummary> | null = null;
let rememberedAccess: ContributorAccessSummary | null = null;

function loadAccess(force = false) {
  if (!force && rememberedAccess) return Promise.resolve(rememberedAccess);
  pendingAccess ??= fetch("/api/me/contributor-access", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Contributor access unavailable");
      const received = await response.json() as Partial<ContributorAccessSummary>;
      rememberedAccess = {
        authenticated: Boolean(received.authenticated),
        active: Boolean(received.active),
        level: received.level ?? (received.active ? "contributor" : "public"),
        minimumResolutionM: received.minimumResolutionM ?? (received.active ? 250 : 2500),
        activeUntil: received.activeUntil ?? null,
        oneKmActiveUntil: received.oneKmActiveUntil ?? received.activeUntil ?? null,
        fineActiveUntil: received.fineActiveUntil ?? received.activeUntil ?? null,
        revokedAt: received.revokedAt ?? null,
      };
      return rememberedAccess;
    })
    .finally(() => { pendingAccess = null; });
  return pendingAccess;
}

export function useContributorMapAccess() {
  const [access, setAccess] = useState<ContributorMapAccess>(() => rememberedAccess
    ? { ...rememberedAccess, checked: true }
    : publicAccess);

  useEffect(() => {
    let cancelled = false;
    const update = (force = false) => void loadAccess(force)
      .then((result) => {
        if (!cancelled) setAccess({ ...result, checked: true });
      })
      .catch(() => {
        if (!cancelled) setAccess({ ...publicAccess, checked: true });
      });
    update(true);
    const refreshOnFocus = () => update(true);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") update(true);
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refresh = window.setInterval(() => update(true), 4 * 60 * 1000);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(refresh);
    };
  }, []);

  return access;
}
