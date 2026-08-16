"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, LoaderCircle, Map as MapIcon } from "lucide-react";
import Link from "next/link";
import { ConditionComparison } from "@/components/condition-comparison";
import { CellScoreHistory } from "@/components/cell-score-history";
import { RegionMap, type PredictionCellDetailState } from "@/components/region-map";
import { QuerySelect, type QuerySelectItem } from "@/components/ui/query-select";
import { regionLabels } from "@/data/regions";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
import { formatGridDimensions } from "@/src/lib/map-grid";
import { calculateSuitability } from "@/src/lib/scoring";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";
import type {
  ConditionSnapshot,
  GlobalSpeciesScore,
  MapViewMode,
  PredictionCell,
  RegionId,
  SpatialGridSizeM,
  SpeciesProfile,
  SuitabilityResult,
} from "@/src/lib/types";

const allRegionIds = Object.keys(regionLabels) as RegionId[];

/**
 * The combined map's detail response returns the top species' full prediction
 * cell, which already carries the scored result. Rebuilding the result from
 * the cell keeps the floating card working without shipping every species
 * profile to the client.
 */
function resultFromCell(cell: PredictionCell): SuitabilityResult {
  const missingComponents = cell.components
    .filter((component) => component.score === null)
    .map((component) => component.id);
  return {
    score: cell.score,
    fruitingConditionsScore: cell.fruitingConditionsScore,
    opportunityIndex: cell.opportunityIndex,
    rawHabitatCoverage: cell.values.habitatCoveragePercent === undefined
      ? null
      : Math.max(0, Math.min(1, cell.values.habitatCoveragePercent / 100)),
    effectiveHabitatCoverage: cell.effectiveHabitatCoverage,
    label: cell.label,
    components: cell.components,
    modelVersion: "",
    dataCompleteness: cell.components.length
      ? (cell.components.length - missingComponents.length) / cell.components.length
      : 0,
    missingComponents,
  };
}

export function MapExplorer({
  species,
  region,
  autoGeolocate,
  mode,
  regionalSnapshot,
  regionalResult,
  regionalTopSpeciesName,
  speciesItems,
  speciesNames,
  info
}: {
  /** null renders the combined all-species map. */
  species: SpeciesProfile | null;
  region: RegionId;
  autoGeolocate: boolean;
  mode: MapViewMode;
  regionalSnapshot: ConditionSnapshot;
  regionalResult: SuitabilityResult;
  /** Combined map only: species behind the regional fallback reading. */
  regionalTopSpeciesName?: string;
  speciesItems: QuerySelectItem[];
  /** Combined map only: display names for ranked species. */
  speciesNames?: Record<string, string>;
  info: ReactNode;
}) {
  const globalMode = species === null;
  const speciesKey = species?.speciesId ?? GLOBAL_SPECIES_ID;
  const mapStage = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{
    speciesId: string;
    cell?: PredictionCell;
    topSpecies?: GlobalSpeciesScore[];
    combined?: { score: number | null; cellId: string; gridSizeM: SpatialGridSizeM };
  }>();
  const [cellDetailSelection, setCellDetailSelection] = useState<{
    speciesId: string;
    state: PredictionCellDetailState;
  }>();
  const cellDetailState = cellDetailSelection?.speciesId === speciesKey
    ? cellDetailSelection.state
    : { status: "idle" } satisfies PredictionCellDetailState;
  const activeSelection = mode === "prediction" && selection?.speciesId === speciesKey
    ? selection
    : undefined;
  const selectedCell = activeSelection?.cell;
  const selectedTopSpecies = globalMode ? activeSelection?.topSpecies ?? [] : [];
  // Combined cell with no scoring species: nothing to attribute, but the cell
  // stays selected so its verified zero (or withheld state) is shown honestly.
  const emptySelection = globalMode && activeSelection && !activeSelection.cell
    ? activeSelection.combined
    : undefined;
  const selectedCellId = mode === "prediction"
    ? cellDetailState.cellId ?? selectedCell?.cellId ?? emptySelection?.cellId
    : undefined;
  const selectCell = useCallback(
    (
      cell?: PredictionCell,
      topSpecies?: GlobalSpeciesScore[],
      combined?: { score: number | null; cellId: string; gridSizeM: SpatialGridSizeM },
    ) => setSelection(
      cell
        ? { speciesId: speciesKey, cell, topSpecies, combined }
        : combined
          ? { speciesId: speciesKey, topSpecies: topSpecies ?? [], combined }
          : undefined,
    ),
    [speciesKey],
  );
  const updateCellDetailState = useCallback((state: PredictionCellDetailState) => {
    if (state.status === "loading") setSelection(undefined);
    setCellDetailSelection({ speciesId: speciesKey, state });
  }, [speciesKey]);
  useEffect(() => {
    if (cellDetailState.status !== "ready") return;
    const timer = window.setTimeout(() => {
      setCellDetailSelection((current) =>
        current?.speciesId === speciesKey &&
        current.state.status === "ready" &&
        current.state.cellId === cellDetailState.cellId
          ? { speciesId: speciesKey, state: { status: "idle" } }
          : current,
      );
    }, 3_000);
    return () => window.clearTimeout(timer);
  }, [cellDetailState.cellId, cellDetailState.status, speciesKey]);
  const snapshot: ConditionSnapshot = selectedCell ?? regionalSnapshot;
  const result = selectedCell
    ? globalMode
      ? resultFromCell(selectedCell)
      : calculateSuitability(species!, snapshot)
    : regionalResult;
  const predictionStatus = getConditionPredictionStatus(snapshot.stale, result);
  const hasPrediction = predictionStatus.kind === "available" && result.score !== null;
  const resultBand = result.score === null ? undefined : getSuitabilityBand(result.score);
  const selectedEffectiveHabitat = selectedCell && typeof result.effectiveHabitatCoverage === "number"
    ? result.effectiveHabitatCoverage
    : undefined;
  const isLoadingCell = cellDetailState.status === "loading";
  const isLoadedCell = cellDetailState.status === "ready" &&
    Boolean(selectedCell ?? emptySelection);
  const hasCellLoadError = cellDetailState.status === "error";
  const selectedGridSizeM = cellDetailState.gridSizeM ?? selectedCell?.gridSizeM ??
    emptySelection?.gridSizeM;
  const speciesName = (speciesId: string) => speciesNames?.[speciesId] ?? speciesId;
  const topSpeciesId = selectedTopSpecies[0]?.speciesId;
  // The floating card stays compact; the full ranking renders below the map.
  const runnersUp = selectedTopSpecies.slice(1, 3);
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
        activeRegions={species?.ecologicalConfig.regions ?? allRegionIds}
        autoGeolocate={autoGeolocate}
        selectedRegion={region}
        speciesId={speciesKey}
        mode={mode}
        predictionAvailable={species ? species.predictionMode === "current" : true}
        selectedCellId={selectedCellId}
        onCellSelect={selectCell}
        onCellDetailStateChange={updateCellDetailState}
        className="full-map"
        fullscreenTarget="parent"
      />
      <label className="map-fullscreen-species-control">
        <span>Espècie</span>
        <QuerySelect
          value={speciesKey}
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
            {!emptySelection && hasPrediction && resultBand ? <i style={{ backgroundColor: resultBand.color }} aria-hidden="true" /> : null}
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
          {emptySelection ? (
            <>
              <strong>{emptySelection.score === 0 ? <>0<small>/100</small></> : "—"}</strong>
              <p>{emptySelection.score === 0
                ? "Cap espècie comestible té puntuació en aquesta cel·la ara mateix."
                : "Puntuació retinguda: falten dades ambientals verificades en aquesta cel·la."}</p>
            </>
          ) : (
            <>
              <strong>{hasPrediction ? <>{result.score}<small>/100</small></> : "—"}</strong>
              <p>{hasPrediction
                ? globalMode
                  ? `${selectedCell && topSpeciesId
                      ? `Millor opció: ${speciesName(topSpeciesId)}`
                      : regionalTopSpeciesName
                        ? `Millor opció: ${regionalTopSpeciesName}`
                        : "Millor puntuació entre espècies comestibles"} · ${result.label}${result.fruitingConditionsScore === null ? "" : ` · condicions per fructificar ${result.fruitingConditionsScore}/100`}`
                  : `Puntuació de la cel·la · ${result.label}${result.fruitingConditionsScore === null ? "" : ` · condicions per fructificar ${result.fruitingConditionsScore}/100`}${selectedEffectiveHabitat === undefined ? "" : ` · ${Math.round(selectedEffectiveHabitat * 100)}% d’hàbitat adequat`}`
                : unavailableCopy}</p>
              {globalMode && hasPrediction && runnersUp.length ? (
                <p>
                  {`També hi destaquen: ${runnersUp
                    .map((item) => `${speciesName(item.speciesId)} (${item.score})`)
                    .join(", ")}`}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
    <div className="page-width map-bottom">
      {mode === "prediction" && !globalMode ? (
        <>
          <ConditionComparison
            expanded
            species={species!}
            snapshot={snapshot}
            result={result}
            cellId={selectedCell?.cellId}
            cellGridSizeM={selectedCell?.gridSizeM}
            cellBounds={selectedCell?.cellBounds}
          />
          {selectedCell ? <CellScoreHistory key={`${species!.speciesId}:${selectedCell.cellId}`} speciesId={species!.speciesId} cell={selectedCell} /> : null}
        </>
      ) : null}
      {globalMode && selectedCell && topSpeciesId ? (
        <section className="map-global-top-species" aria-label="Espècies amb millor puntuació de la cel·la">
          <div>
            <p className="eyebrow">Espècies amb puntuació en aquesta cel·la</p>
            <ol className="map-global-species-list">
              {selectedTopSpecies.map((item) => (
                <li key={item.speciesId}>
                  <i
                    style={{ backgroundColor: getSuitabilityBand(item.score).color }}
                    aria-hidden
                  />
                  <Link href={`/map?species=${item.speciesId}&region=${region}`}>
                    {speciesName(item.speciesId)}
                  </Link>
                  <strong>{item.score}<small>/100</small></strong>
                </li>
              ))}
            </ol>
          </div>
          <p>
            La lectura detallada següent correspon a <strong>{speciesName(topSpeciesId)}</strong>,
            l’espècie amb la millor puntuació dins d’aquesta cel·la.{" "}
            <Link href={`/map?species=${topSpeciesId}&region=${region}`} className="text-link">
              Veure el mapa complet de {speciesName(topSpeciesId)} <ArrowUpRight size={15} />
            </Link>
          </p>
          <CellScoreHistory
            key={`${topSpeciesId}:${selectedCell.cellId}`}
            speciesId={topSpeciesId}
            cell={selectedCell}
          />
        </section>
      ) : null}
      {info}
    </div>
  </>;
}
