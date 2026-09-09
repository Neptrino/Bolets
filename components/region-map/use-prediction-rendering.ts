"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { PredictionRendering } from "./prediction-surface";

const renderingStorageKey = "bolets-map-rendering";
const listeners = new Set<() => void>();
// Fallback when browser storage is unavailable, so the choice still holds
// for the rest of the visit.
let rememberedRendering: PredictionRendering | null = null;

function isPredictionRendering(value: string | null): value is PredictionRendering {
  return value === "cells" || value === "heatmap";
}

function storedRendering(): PredictionRendering | null {
  try {
    const stored = window.localStorage.getItem(renderingStorageKey);
    if (isPredictionRendering(stored)) return stored;
  } catch {
    // Fall through to the in-memory choice.
  }
  return rememberedRendering;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const serverSnapshot = () => null;

/**
 * The surface rendering a viewer picked in the map layer panel. Interactive
 * maps remember it in the browser like the basemap; editorial maps keep the
 * rendering their page asked for.
 */
export function usePredictionRendering(
  initialRendering: PredictionRendering,
  rememberSelection: boolean,
) {
  const stored = useSyncExternalStore(
    subscribe,
    rememberSelection ? storedRendering : serverSnapshot,
    serverSnapshot,
  );

  const changeRendering = useCallback((next: PredictionRendering) => {
    rememberedRendering = next;
    try {
      window.localStorage.setItem(renderingStorageKey, next);
    } catch {
      // The in-memory choice still applies when browser storage is unavailable.
    }
    for (const listener of listeners) listener();
  }, []);

  return { rendering: stored ?? initialRendering, changeRendering };
}
