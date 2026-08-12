"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Map as MapIcon } from "lucide-react";
import { ConditionComparison } from "@/components/condition-comparison";
import { RegionMap } from "@/components/region-map";
import { QuerySelect, type QuerySelectItem } from "@/components/ui/query-select";
import { regionLabels } from "@/data/regions";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";
import { formatGridDimensions } from "@/src/lib/map-grid";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot, PredictionCell, RegionId, SpeciesProfile, SuitabilityResult } from "@/src/lib/types";

export function MapExplorer({
  species,
  region,
  regionalSnapshot,
  regionalResult,
  speciesItems,
  info
}: {
  species: SpeciesProfile;
  region: RegionId;
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
  const selectedCell = selection?.speciesId === species.speciesId
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
  const unavailableCopy = predictionStatus.kind === "environment-unavailable"
    ? "sense dades ambientals verificades"
    : selectedCell
      ? "puntuació local no disponible"
      : "selecciona una cel·la per calcular la puntuació";

  return <>
    <div ref={mapStage} className="map-stage">
      <RegionMap
        activeRegions={species.ecologicalConfig.regions}
        selectedRegion={region}
        speciesId={species.speciesId}
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
      <div className="map-floating-card">
        <MapIcon size={17} />
        <span>{selectedCell ? `Cel·la ${formatGridDimensions(selectedCell.gridSizeM)}` : regionLabels[region]}</span>
        <strong>{hasPrediction ? `${result.score}/100` : "—"}</strong>
        <p>{hasPrediction ? `${result.label} · ${selectedCell ? "lectura local" : "lectura regional"}` : unavailableCopy}</p>
      </div>
    </div>
    <div className="page-width map-bottom">
      <ConditionComparison
        expanded
        species={species}
        snapshot={snapshot}
        result={result}
        cellId={selectedCell?.cellId}
        cellGridSizeM={selectedCell?.gridSizeM}
        occurrenceEvidence={selectedCell?.occurrenceEvidence}
        occurrenceEvidenceStatus={selectedCell?.occurrenceEvidenceStatus}
        onReset={selectedCell ? () => setSelection(undefined) : undefined}
      />
      {info}
    </div>
  </>;
}
