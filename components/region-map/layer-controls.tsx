import { MapModeControl } from "@/components/map-mode-control";
import type { MapViewMode } from "@/src/lib/types";
import { RegionMapBasemapControl } from "./basemap-control";
import { RegionMapControlPanel } from "./control-panel";
import {
  MapLayerControl,
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

  return (
    <RegionMapControlPanel
      expanded={layerControlsExpanded}
      id={layerControlsId}
      onExpandedChange={onExpandedChange}
    >
        {!habitat && !globalPrediction ? (
          <MapModeControl mode={mode} predictionAvailable={predictionAvailable} />
        ) : null}
        <RegionMapBasemapControl
          choiceName={basemapChoiceName}
          onChange={onBasemapChange}
          selectedId={selectedBasemapId}
          status={basemapStatus}
        />
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
    </RegionMapControlPanel>
  );
}
