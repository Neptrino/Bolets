"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Map as MapIcon } from "lucide-react";
import { ConditionComparison } from "@/components/condition-comparison";
import { RegionMap } from "@/components/region-map";
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
  info
}: {
  species: SpeciesProfile;
  region: RegionId;
  regionalSnapshot: ConditionSnapshot;
  regionalResult: SuitabilityResult;
  info: ReactNode;
}) {
  const [selectedCell, setSelectedCell] = useState<PredictionCell>();
  const selectCell = useCallback((cell?: PredictionCell) => setSelectedCell(cell), []);
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
    <div className="map-stage">
      <RegionMap
        activeRegions={species.ecologicalConfig.regions}
        selectedRegion={region}
        speciesId={species.speciesId}
        selectedCellId={selectedCell?.cellId}
        onCellSelect={selectCell}
        className="full-map"
        fullscreenTarget="parent"
      />
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
        onReset={selectedCell ? () => setSelectedCell(undefined) : undefined}
      />
      {info}
    </div>
  </>;
}
