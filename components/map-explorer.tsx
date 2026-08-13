"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Map as MapIcon } from "lucide-react";
import { ConditionComparison } from "@/components/condition-comparison";
import { CellScoreHistory } from "@/components/cell-score-history";
import { RegionMap } from "@/components/region-map";
import { QuerySelect, type QuerySelectItem } from "@/components/ui/query-select";
import { regionLabels } from "@/data/regions";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";
import { formatGridDimensions } from "@/src/lib/map-grid";
import { calculateSuitability } from "@/src/lib/scoring";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";
import type { ConditionSnapshot, MapViewMode, PredictionCell, RegionId, SpeciesProfile, SuitabilityResult } from "@/src/lib/types";

export function MapExplorer({
  species,
  region,
  autoGeolocate,
  mode,
  regionalSnapshot,
  regionalResult,
  speciesItems,
  info
}: {
  species: SpeciesProfile;
  region: RegionId;
  autoGeolocate: boolean;
  mode: MapViewMode;
  regionalSnapshot: ConditionSnapshot;
  regionalResult: SuitabilityResult;
  speciesItems: QuerySelectItem[];
  info: ReactNode;
}) {
  const mapStage = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{
    speciesId: string;
    cell: PredictionCell;
  }>();
  const selectedCell = mode === "prediction" && selection?.speciesId === species.speciesId
    ? selection.cell
    : undefined;
  const selectCell = useCallback(
    (cell?: PredictionCell) => setSelection(
      cell ? { speciesId: species.speciesId, cell } : undefined,
    ),
    [species.speciesId],
  );
  const snapshot: ConditionSnapshot = selectedCell ?? regionalSnapshot;
  const result = selectedCell ? calculateSuitability(species, snapshot) : regionalResult;
  const predictionStatus = getConditionPredictionStatus(snapshot.stale, result);
  const hasPrediction = predictionStatus.kind === "available" && result.score !== null;
  const resultBand = result.score === null ? undefined : getSuitabilityBand(result.score);
  const selectedHabitatCoverage = selectedCell?.values.forestCompatibility;
  const unavailableCopy = predictionStatus.kind === "environment-unavailable"
    ? "sense dades ambientals verificades"
    : selectedCell
      ? "puntuació local no disponible"
      : "selecciona una cel·la per calcular la puntuació";

  return <>
    <div ref={mapStage} className="map-stage">
      <RegionMap
        activeRegions={species.ecologicalConfig.regions}
        autoGeolocate={autoGeolocate}
        selectedRegion={region}
        speciesId={species.speciesId}
        mode={mode}
        predictionAvailable={species.predictionMode === "current"}
        selectedCellId={selectedCell?.cellId}
        onCellSelect={selectCell}
        className="full-map"
        fullscreenTarget="parent"
      />
      <label className="map-fullscreen-species-control">
        <span>Espècie</span>
        <QuerySelect
          value={species.speciesId}
          items={speciesItems}
          portalContainer={mapStage}
          aria-label="Canvia l’espècie del mapa en pantalla completa"
        />
      </label>
      {mode === "prediction" ? (
        <div className="map-floating-card" aria-live="polite">
          <div className="map-floating-card-label">
            <MapIcon size={17} aria-hidden="true" />
            <span>{selectedCell ? `Cel·la ${formatGridDimensions(selectedCell.gridSizeM)}` : regionLabels[region]}</span>
            {hasPrediction && resultBand ? <i style={{ backgroundColor: resultBand.color }} aria-hidden="true" /> : null}
          </div>
          <strong>{hasPrediction ? <>{result.score}<small>/100</small></> : "—"}</strong>
          <p>{hasPrediction
            ? `${result.label} · ${selectedCell ? "lectura local" : "lectura regional"}${selectedHabitatCoverage === undefined ? "" : ` · ${Math.round(selectedHabitatCoverage)}% d’hàbitat compatible`}`
            : unavailableCopy}</p>
        </div>
      ) : null}
    </div>
    <div className="page-width map-bottom">
      {mode === "prediction" ? (
        <>
          <ConditionComparison
            expanded
            species={species}
            snapshot={snapshot}
            result={result}
            cellId={selectedCell?.cellId}
            cellGridSizeM={selectedCell?.gridSizeM}
            cellBounds={selectedCell?.cellBounds}
            occurrenceEvidence={selectedCell?.occurrenceEvidence}
            occurrenceEvidenceStatus={selectedCell?.occurrenceEvidenceStatus}
          />
          {selectedCell ? <CellScoreHistory key={`${species.speciesId}:${selectedCell.cellId}`} speciesId={species.speciesId} cell={selectedCell} /> : null}
        </>
      ) : null}
      {info}
    </div>
  </>;
}
