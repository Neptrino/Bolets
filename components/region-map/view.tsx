import type { RefObject } from "react";
import type { Map as MapLibreMap } from "maplibre-gl";
import { HabitatMapLegend } from "@/components/habitat-map-legend";
import { PredictionTimelineControl } from "@/components/prediction-timeline-control";
import type { MapViewMode, PredictionTimelineOffset, RegionId } from "@/src/lib/types";
import { RegionMapFrame } from "./frame";
import { RegionMapDataStatus } from "./data-status";
import { RegionMapLayerControls } from "./layer-controls";
import type { MapStatusCopy } from "./status";
import { type BasemapId, type CellState } from "./support";

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
  habitat,
  historicalEvidenceCanvas,
  historicalEvidenceOpacity,
  historicalEvidenceOpacityId,
  historicalEvidenceVisible,
  interactive,
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
  showDataStatus,
  showReadyStatus,
  showTimeline,
  speciesId,
  statusCopy,
  timelineOffset,
  onTimelineOffsetChange,
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
  habitat: boolean;
  historicalEvidenceCanvas: RefObject<HTMLCanvasElement | null>;
  historicalEvidenceOpacity: number;
  historicalEvidenceOpacityId: string;
  historicalEvidenceVisible: boolean;
  interactive: boolean;
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
  showDataStatus: boolean;
  showReadyStatus: boolean;
  showTimeline: boolean;
  speciesId?: string;
  statusCopy: MapStatusCopy;
  timelineOffset: PredictionTimelineOffset;
  onTimelineOffsetChange: (offset: PredictionTimelineOffset) => void;
  cellState: CellState;
}) {
  return (
    <RegionMapFrame
      activeRegionCount={activeRegionCount}
      ariaBusy={cellState.status === "loading"}
      ariaLabel={interactive
        ? "Mapa interactiu de Catalunya. Arrossega per desplaçar-te i utilitza els controls per canviar l’escala o el fons cartogràfic."
        : "Mapa estàtic de les condicions actuals a Catalunya."}
      basemapId={selectedBasemapId}
      className={`${habitat ? "region-map-habitat" : ""}${showCompatibility ? " region-map-compatibility" : ""} ${className}`}
      map={map}
      mapMode={showCompatibility ? "compatibility" : "prediction"}
      node={node}
      selectedRegion={selectedRegion}
      showResetButton={interactive}
    >
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
      {showTimeline ? (
        <PredictionTimelineControl
          incomplete={cellState.incomplete}
          loading={cellState.status === "loading"}
          offset={timelineOffset}
          onChange={onTimelineOffsetChange}
          unavailable={cellState.status === "error"}
        />
      ) : null}
      {showDataStatus ? <RegionMapDataStatus
        cellState={cellState}
        compactLegend={compactLegend}
        habitat={habitat}
        showCompatibility={showCompatibility}
        showReadyStatus={showReadyStatus}
        speciesId={speciesId}
        statusCopy={statusCopy}
      /> : null}
      {interactive ? (
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
      ) : null}
      {habitat ? (
        <HabitatMapLegend
          compact={compactLegend}
          detail={statusCopy.detail}
          historicalEvidenceDetail={evidenceCopy}
          title={statusCopy.title}
        />
      ) : null}
    </RegionMapFrame>
  );
}
