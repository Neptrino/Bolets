"use client";

import { useEffect, useState } from "react";
import type { ContributorAccessSummary } from "@/src/lib/contributions";

export type ContributorMapAccess = ContributorAccessSummary & { checked: boolean };

const publicAccess: ContributorMapAccess = {
  checked: false,
  authenticated: false,
  active: false,
  activeUntil: null,
  revokedAt: null,
};

let pendingAccess: Promise<ContributorAccessSummary> | null = null;
let rememberedAccess: ContributorAccessSummary | null = null;

function loadAccess(force = false) {
  if (!force && rememberedAccess) return Promise.resolve(rememberedAccess);
  pendingAccess ??= fetch("/api/me/contributor-access", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Contributor access unavailable");
      rememberedAccess = await response.json() as ContributorAccessSummary;
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
