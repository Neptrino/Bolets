"use client";

import { Blend, Grid2x2, type LucideIcon } from "lucide-react";
import { useId } from "react";
import type { PredictionRendering } from "./prediction-surface";

const renderingOptions: Array<{
  value: PredictionRendering;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    value: "cells",
    label: "Sectors exactes",
    shortLabel: "Sectors",
    description: "Cada sector amb el seu valor i els límits visibles.",
    icon: Grid2x2,
  },
  {
    value: "heatmap",
    label: "Superfície suavitzada",
    shortLabel: "Suavitzat",
    description: "Els valors dels sectors es fonen en una superfície contínua.",
    icon: Blend,
  },
];

export function RegionMapRenderingControl({
  onChange,
  rendering,
}: {
  onChange: (rendering: PredictionRendering) => void;
  rendering: PredictionRendering;
}) {
  const choiceName = useId();
  const labelId = useId();

  return (
    <div
      className="map-mode-control map-rendering-control"
      role="radiogroup"
      aria-labelledby={labelId}
    >
      <span id={labelId} className="map-mode-control-label">
        Representació
      </span>
      <div className="map-mode-options">
        {renderingOptions.map((option) => {
          const Icon = option.icon;
          return (
            <label key={option.value} className="map-mode-option" title={option.description}>
              <input
                type="radio"
                name={choiceName}
                value={option.value}
                checked={rendering === option.value}
                aria-label={`${option.label}: ${option.description}`}
                onChange={() => onChange(option.value)}
              />
              <span aria-hidden><Icon size={16} />{option.shortLabel}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
