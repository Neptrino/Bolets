import { SlidersHorizontal, X } from "lucide-react";
import { MapModeControl } from "@/components/map-mode-control";
import type { MapViewMode } from "@/src/lib/types";
import {
  MapLayerControl,
  basemapOptions,
  type BasemapId,
} from "./support";

export function RegionMapLayerControls({
  basemapChoiceName,
  basemapStatus,
  cellOpacity,
  cellOpacityId,
  cellsVisible,
  globalPrediction,
  habitat,
  historicalEvidenceOpacity,
  historicalEvidenceOpacityId,
  historicalEvidenceVisible,
  layerControlsExpanded,
  layerControlsId,
  mode,
  onBasemapChange,
  onCellOpacityChange,
  onCellsVisibilityChange,
  onExpandedChange,
  onHistoricalEvidenceOpacityChange,
  onHistoricalEvidenceVisibilityChange,
  predictionAvailable,
  selectedBasemapId,
  showCompatibility,
  speciesId,
}: {
  basemapChoiceName: string;
  basemapStatus: "idle" | "loading" | "error";
  cellOpacity: number;
  cellOpacityId: string;
  cellsVisible: boolean;
  globalPrediction: boolean;
  habitat: boolean;
  historicalEvidenceOpacity: number;
  historicalEvidenceOpacityId: string;
  historicalEvidenceVisible: boolean;
  layerControlsExpanded: boolean;
  layerControlsId: string;
  mode: MapViewMode;
  onBasemapChange: (basemap: BasemapId) => void;
  onCellOpacityChange: (opacity: number) => void;
  onCellsVisibilityChange: () => void;
  onExpandedChange: () => void;
  onHistoricalEvidenceOpacityChange: (opacity: number) => void;
  onHistoricalEvidenceVisibilityChange: () => void;
  predictionAvailable: boolean;
  selectedBasemapId: BasemapId;
  showCompatibility: boolean;
  speciesId?: string;
}) {
  if (!speciesId) return null;

  const panelLabel = layerControlsExpanded
    ? "Amaga els controls del mapa"
    : "Mostra els controls del mapa";

  return (
    <div className={`map-cell-visibility${layerControlsExpanded ? "" : " is-collapsed"}`}>
      <div className="map-cell-visibility-header">
        <strong className="map-cell-visibility-title">Capes del mapa</strong>
        <button
          type="button"
          className="map-cell-visibility-panel-toggle"
          aria-controls={layerControlsId}
          aria-expanded={layerControlsExpanded}
          aria-label={panelLabel}
          title={panelLabel}
          onClick={onExpandedChange}
        >
          {layerControlsExpanded ? (
            <X size={16} aria-hidden />
          ) : (
            <SlidersHorizontal size={16} aria-hidden />
          )}
        </button>
      </div>
      <div
        id={layerControlsId}
        className="map-cell-visibility-controls"
        role="group"
        aria-label="Capes del mapa"
        hidden={!layerControlsExpanded}
      >
        {!habitat && !globalPrediction ? (
          <MapModeControl mode={mode} predictionAvailable={predictionAvailable} />
        ) : null}
        <fieldset
          className="map-basemap-control"
          disabled={basemapStatus === "loading"}
          aria-busy={basemapStatus === "loading"}
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
                  name={basemapChoiceName}
                  value={option.id}
                  checked={selectedBasemapId === option.id}
                  aria-label={`${option.label}: ${option.description}`}
                  onChange={() => onBasemapChange(option.id)}
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
          {basemapStatus !== "idle" ? (
            <p className="map-basemap-status" aria-live="polite">
              {basemapStatus === "loading"
                ? "Canviant el fons…"
                : "No s’ha pogut carregar aquest fons."}
            </p>
          ) : null}
        </fieldset>
        <MapLayerControl
          id={cellOpacityId}
          label={showCompatibility ? "Zones compatibles" : "Predicció"}
          controlName={showCompatibility ? "les zones compatibles" : "la predicció"}
          opacityLabel={showCompatibility
            ? "Opacitat de les zones compatibles"
            : "Opacitat de la predicció"}
          variant={showCompatibility ? "compatibility" : "prediction"}
          visible={cellsVisible}
          opacity={cellOpacity}
          onVisibilityChange={onCellsVisibilityChange}
          onOpacityChange={onCellOpacityChange}
        />
        {showCompatibility ? (
          <MapLayerControl
            id={historicalEvidenceOpacityId}
            label="Registres històrics"
            controlName="els registres històrics"
            opacityLabel="Opacitat dels registres històrics"
            variant="history"
            visible={historicalEvidenceVisible}
            opacity={historicalEvidenceOpacity}
            onVisibilityChange={onHistoricalEvidenceVisibilityChange}
            onOpacityChange={onHistoricalEvidenceOpacityChange}
          />
        ) : null}
      </div>
    </div>
  );
}
