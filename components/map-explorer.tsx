"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, LoaderCircle, Map as MapIcon } from "lucide-react";
import { ConditionComparison } from "@/components/condition-comparison";
import { CellScoreHistory } from "@/components/cell-score-history";
import { RegionMap, type PredictionCellDetailState } from "@/components/region-map";
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
  const [cellDetailSelection, setCellDetailSelection] = useState<{
    speciesId: string;
    state: PredictionCellDetailState;
  }>();
  const cellDetailState = cellDetailSelection?.speciesId === species.speciesId
    ? cellDetailSelection.state
    : { status: "idle" } satisfies PredictionCellDetailState;
  const selectedCell = mode === "prediction" && selection?.speciesId === species.speciesId
    ? selection.cell
    : undefined;
  const selectedCellId = mode === "prediction"
    ? cellDetailState.cellId ?? selectedCell?.cellId
    : undefined;
  const selectCell = useCallback(
    (cell?: PredictionCell) => setSelection(
      cell ? { speciesId: species.speciesId, cell } : undefined,
    ),
    [species.speciesId],
  );
  const updateCellDetailState = useCallback((state: PredictionCellDetailState) => {
    if (state.status === "loading") setSelection(undefined);
    setCellDetailSelection({ speciesId: species.speciesId, state });
  }, [species.speciesId]);
  useEffect(() => {
    if (cellDetailState.status !== "ready") return;
    const timer = window.setTimeout(() => {
      setCellDetailSelection((current) =>
        current?.speciesId === species.speciesId &&
        current.state.status === "ready" &&
        current.state.cellId === cellDetailState.cellId
          ? { speciesId: species.speciesId, state: { status: "idle" } }
          : current,
      );
    }, 3_000);
    return () => window.clearTimeout(timer);
  }, [cellDetailState.cellId, cellDetailState.status, species.speciesId]);
  const snapshot: ConditionSnapshot = selectedCell ?? regionalSnapshot;
  const result = selectedCell ? calculateSuitability(species, snapshot) : regionalResult;
  const predictionStatus = getConditionPredictionStatus(snapshot.stale, result);
  const hasPrediction = predictionStatus.kind === "available" && result.score !== null;
  const resultBand = result.score === null ? undefined : getSuitabilityBand(result.score);
  const selectedEffectiveHabitat = selectedCell && typeof result.effectiveHabitatCoverage === "number"
    ? result.effectiveHabitatCoverage
    : undefined;
  const isLoadingCell = cellDetailState.status === "loading";
  const isLoadedCell = cellDetailState.status === "ready" && Boolean(selectedCell);
  const hasCellLoadError = cellDetailState.status === "error";
  const selectedGridSizeM = cellDetailState.gridSizeM ?? selectedCell?.gridSizeM;
  const unavailableCopy = isLoadingCell
    ? "Actualitzant el model d’aquesta cel·la amb les seves dades ambientals…"
    : hasCellLoadError
      ? "No s’ha pogut carregar el model local d’aquesta cel·la. Torna-la a seleccionar."
    : predictionStatus.kind === "environment-unavailable"
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
        selectedCellId={selectedCellId}
        onCellSelect={selectCell}
        onCellDetailStateChange={updateCellDetailState}
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
            <span>{selectedGridSizeM ? `Cel·la ${formatGridDimensions(selectedGridSizeM)}` : regionLabels[region]}</span>
            {hasPrediction && resultBand ? <i style={{ backgroundColor: resultBand.color }} aria-hidden="true" /> : null}
          </div>
          {isLoadingCell || isLoadedCell || hasCellLoadError ? (
            <span
              className={`map-floating-card-status ${isLoadingCell ? "is-loading" : hasCellLoadError ? "is-error" : "is-ready"}`}
              role="status"
              aria-live="polite"
            >
              {isLoadingCell ? <LoaderCircle size={14} aria-hidden="true" /> : isLoadedCell ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
              {isLoadingCell ? "Carregant model local" : isLoadedCell ? "Model local carregat" : "No s’ha pogut carregar"}
            </span>
          ) : null}
          <strong>{hasPrediction ? <>{result.score}<small>/100</small></> : "—"}</strong>
          <p>{hasPrediction
            ? `Puntuació de la cel·la · ${result.label}${result.fruitingConditionsScore === null ? "" : ` · condicions per fructificar ${result.fruitingConditionsScore}/100`}${selectedEffectiveHabitat === undefined ? "" : ` · ${Math.round(selectedEffectiveHabitat * 100)}% d’hàbitat adequat`}`
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
          />
          {selectedCell ? <CellScoreHistory key={`${species.speciesId}:${selectedCell.cellId}`} speciesId={species.speciesId} cell={selectedCell} /> : null}
        </>
      ) : null}
      {info}
    </div>
  </>;
}
