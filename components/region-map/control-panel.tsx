"use client";

import type { ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

export function RegionMapControlPanel({
  children,
  expanded,
  id,
  onExpandedChange,
}: {
  children: ReactNode;
  expanded: boolean;
  id: string;
  onExpandedChange: () => void;
}) {
  const panelLabel = expanded
    ? "Amaga els controls del mapa"
    : "Mostra els controls del mapa";

  return (
    <div className={`map-cell-visibility${expanded ? "" : " is-collapsed"}`}>
      <div className="map-cell-visibility-header">
        <strong className="map-cell-visibility-title">Capes del mapa</strong>
        <button
          type="button"
          className="map-cell-visibility-panel-toggle"
          aria-controls={id}
          aria-expanded={expanded}
          aria-label={panelLabel}
          title={panelLabel}
          onClick={onExpandedChange}
        >
          {expanded ? <X size={16} aria-hidden /> : <SlidersHorizontal size={16} aria-hidden />}
        </button>
      </div>
      <div
        id={id}
        className="map-cell-visibility-controls"
        role="group"
        aria-label="Capes del mapa"
        hidden={!expanded}
      >
        {children}
      </div>
    </div>
  );
}
