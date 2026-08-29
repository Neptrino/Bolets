"use client";

import {
  basemapOptions,
  type BasemapId,
} from "./support";

export function RegionMapBasemapControl({
  choiceName,
  onChange,
  selectedId,
  status,
}: {
  choiceName: string;
  onChange: (basemap: BasemapId) => void;
  selectedId: BasemapId;
  status: "idle" | "loading" | "error";
}) {
  return (
    <fieldset
      className="map-basemap-control"
      disabled={status === "loading"}
      aria-busy={status === "loading"}
    >
      <legend>Fons cartogràfic</legend>
      <div className="map-basemap-options">
        {basemapOptions.map((option) => (
          <label
            key={option.id}
            className="map-basemap-option"
            title={option.description}
          >
            <input
              type="radio"
              name={choiceName}
              value={option.id}
              checked={selectedId === option.id}
              aria-label={`${option.label}: ${option.description}`}
              onChange={() => onChange(option.id)}
            />
            <span
              className={`map-basemap-preview map-basemap-preview-${option.preview}`}
              aria-hidden
            />
            <span className="map-basemap-option-label">{option.shortLabel}</span>
            <span className="map-basemap-option-provider">{option.provider}</span>
          </label>
        ))}
      </div>
      {status !== "idle" ? (
        <p className="map-basemap-status" aria-live="polite">
          {status === "loading"
            ? "Canviant el fons…"
            : "No s’ha pogut carregar aquest fons."}
        </p>
      ) : null}
    </fieldset>
  );
}
