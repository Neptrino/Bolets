"use client";

import { Hand, Maximize2, Minimize2 } from "lucide-react";
import { createElement, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Species3dModel } from "@/data/species-3d-models";

function subscribeFullscreen(onChange: () => void) {
  document.addEventListener("fullscreenchange", onChange);
  return () => document.removeEventListener("fullscreenchange", onChange);
}

declare global {
  interface Window {
    ModelViewerElement?: { dracoDecoderLocation?: string };
  }
}

/**
 * The <model-viewer> element for the dedicated 3D page. The still render
 * holds the frame while the 3D runtime and the GLB load.
 */
export function SpeciesModelViewer({ model, label }: { model: Species3dModel; label: string }) {
  const [ready, setReady] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const nativeFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => stageRef.current !== null && document.fullscreenElement === stageRef.current,
    () => false,
  );
  // Where element fullscreen is unavailable (iPhone Safari) or refused, the
  // stage fills the window instead.
  const [expanded, setExpanded] = useState(false);
  const fullscreen = nativeFullscreen || expanded;

  useEffect(() => {
    if (!expanded) return;
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  function toggleFullscreen() {
    if (expanded) return setExpanded(false);
    if (document.fullscreenElement) return void document.exitFullscreen();
    const stage = stageRef.current;
    if (stage && document.fullscreenEnabled) stage.requestFullscreen().catch(() => setExpanded(true));
    else setExpanded(true);
  }

  useEffect(() => {
    let cancelled = false;
    // Decode Draco geometry from our own origin instead of Google's CDN.
    window.ModelViewerElement = { ...window.ModelViewerElement, dracoDecoderLocation: "/models/draco/" };
    import("@google/model-viewer").then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <figure className="species-model">
      <div className={`species-model-stage${expanded ? " is-expanded" : ""}`} ref={stageRef}>
        {ready
          ? createElement("model-viewer", {
              src: model.src,
              poster: model.poster,
              alt: label,
              "camera-controls": true,
              "auto-rotate": true,
              "auto-rotate-delay": 0,
              "rotation-per-second": "18deg",
              "interaction-prompt": "none",
              "touch-action": "pan-y",
              "shadow-intensity": "1",
              "shadow-softness": "0.8",
              "tone-mapping": "neutral",
              ar: true,
              "ar-modes": "webxr scene-viewer quick-look",
              class: "species-model-canvas",
            })
          : (
            // eslint-disable-next-line @next/next/no-img-element -- still render served as-is beside its GLB
            <img className="species-model-still" src={model.poster} alt={label} decoding="async" />
          )}
        <button
            type="button"
            className="species-model-fullscreen"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Surt de la pantalla completa" : "Mostra el model a pantalla completa"}
            aria-pressed={fullscreen}
          >
            {fullscreen ? <Minimize2 size={18} aria-hidden="true" /> : <Maximize2 size={18} aria-hidden="true" />}
          </button>
      </div>
      <figcaption className="species-model-hint">
        <Hand size={14} aria-hidden="true" /> Arrossega per girar-lo i pessiga per apropar-t’hi.
      </figcaption>
    </figure>
  );
}
