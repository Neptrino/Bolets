import type { RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { HabitatMapLegend } from "@/components/habitat-map-legend";
import type { MapViewMode, RegionId } from "@/src/lib/types";
import { RegionMapDataStatus } from "./data-status";
import { RegionMapLayerControls } from "./layer-controls";
import type { MapStatusCopy } from "./status";
import { fitCatalonia, type BasemapId, type CellState } from "./support";

export function RegionMapView({
  activeRegionCount,
  basemapChoiceName,
  basemapStatus,
  cellCanvas,
  cellOpacity,
  cellOpacityId,
  cellsVisible,
  className,
  compactLegend,
  evidenceCopy,
  globalPrediction,
  gridDimensions,
  habitat,
  historicalEvidenceCanvas,
  historicalEvidenceOpacity,
  historicalEvidenceOpacityId,
  historicalEvidenceVisible,
  layerControlsExpanded,
  layerControlsId,
  map,
  mode,
  node,
  onBasemapChange,
  onCellOpacityChange,
  onCellsVisibilityChange,
  onHistoricalEvidenceOpacityChange,
  onHistoricalEvidenceVisibilityChange,
  onLayerControlsToggle,
  predictionAvailable,
  selectedBasemapId,
  selectedRegion,
  showCompatibility,
  speciesId,
  statusCopy,
  cellState,
}: {
  activeRegionCount: number;
  basemapChoiceName: string;
  basemapStatus: "idle" | "loading" | "error";
  cellCanvas: RefObject<HTMLCanvasElement | null>;
  cellOpacity: number;
  cellOpacityId: string;
  cellsVisible: boolean;
  className: string;
  compactLegend: boolean;
  evidenceCopy: string;
  globalPrediction: boolean;
  gridDimensions: string;
  habitat: boolean;
  historicalEvidenceCanvas: RefObject<HTMLCanvasElement | null>;
  historicalEvidenceOpacity: number;
  historicalEvidenceOpacityId: string;
  historicalEvidenceVisible: boolean;
  layerControlsExpanded: boolean;
  layerControlsId: string;
  map: RefObject<MapLibreMap | null>;
  mode: MapViewMode;
  node: RefObject<HTMLDivElement | null>;
  onBasemapChange: (basemap: BasemapId) => void;
  onCellOpacityChange: (opacity: number) => void;
  onCellsVisibilityChange: () => void;
  onHistoricalEvidenceOpacityChange: (opacity: number) => void;
  onHistoricalEvidenceVisibilityChange: () => void;
  onLayerControlsToggle: () => void;
  predictionAvailable: boolean;
  selectedBasemapId: BasemapId;
  selectedRegion?: RegionId;
  showCompatibility: boolean;
  speciesId?: string;
  statusCopy: MapStatusCopy;
  cellState: CellState;
}) {
  return (
    <div
      className={`region-map${habitat ? " region-map-habitat" : ""}${showCompatibility ? " region-map-compatibility" : ""} ${className}`}
      data-active-region-count={activeRegionCount}
      data-selected-region={selectedRegion}
      data-basemap={selectedBasemapId}
      data-map-mode={showCompatibility ? "compatibility" : "prediction"}
      aria-busy={cellState.status === "loading"}
      aria-label="Mapa interactiu de Catalunya. Arrossega per desplaçar-te i utilitza els controls per canviar l’escala o el fons cartogràfic."
      role="region"
    >
      <div className="region-map-viewport">
        <div ref={node} className="region-map-surface" />
        <canvas
          ref={cellCanvas}
          className="region-map-cells"
          style={{ opacity: cellsVisible ? cellOpacity / 100 : 0 }}
          aria-hidden
        />
        {showCompatibility ? (
          <canvas
            ref={historicalEvidenceCanvas}
            className="region-map-history"
            style={{
              opacity: historicalEvidenceVisible
                ? historicalEvidenceOpacity / 100
                : 0,
            }}
            aria-hidden
          />
        ) : null}
        <RegionMapDataStatus
          cellState={cellState}
          compactLegend={compactLegend}
          gridDimensions={gridDimensions}
          habitat={habitat}
          showCompatibility={showCompatibility}
          speciesId={speciesId}
          statusCopy={statusCopy}
        />
        <RegionMapLayerControls
          basemapChoiceName={basemapChoiceName}
          basemapStatus={basemapStatus}
          cellOpacity={cellOpacity}
          cellOpacityId={cellOpacityId}
          cellsVisible={cellsVisible}
          globalPrediction={globalPrediction}
          habitat={habitat}
          historicalEvidenceOpacity={historicalEvidenceOpacity}
          historicalEvidenceOpacityId={historicalEvidenceOpacityId}
          historicalEvidenceVisible={historicalEvidenceVisible}
          layerControlsExpanded={layerControlsExpanded}
          layerControlsId={layerControlsId}
          mode={mode}
          onBasemapChange={onBasemapChange}
          onCellOpacityChange={onCellOpacityChange}
          onCellsVisibilityChange={onCellsVisibilityChange}
          onExpandedChange={onLayerControlsToggle}
          onHistoricalEvidenceOpacityChange={onHistoricalEvidenceOpacityChange}
          onHistoricalEvidenceVisibilityChange={onHistoricalEvidenceVisibilityChange}
          predictionAvailable={predictionAvailable}
          selectedBasemapId={selectedBasemapId}
          showCompatibility={showCompatibility}
          speciesId={speciesId}
        />
        <button
          type="button"
          className="map-reset-button"
          onClick={() => {
            if (map.current) fitCatalonia(map.current);
          }}
          aria-label="Veure tot Catalunya"
        >
          Tot Catalunya
        </button>
      </div>
      {habitat ? (
        <HabitatMapLegend
          compact={compactLegend}
          detail={statusCopy.detail}
          historicalEvidenceDetail={evidenceCopy}
          title={statusCopy.title}
        />
      ) : null}
    </div>
  );
}
