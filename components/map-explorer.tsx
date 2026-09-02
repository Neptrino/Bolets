"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, Info, ListFilter, LoaderCircle, Map as MapIcon, Trees, X } from "lucide-react";
import Link from "next/link";
import { ConditionComparison } from "@/components/condition-comparison";
import {
  RegionMap,
  type PredictionCellDetailState,
  type PredictionViewportStatus,
} from "@/components/region-map";
import { QuerySelect, type QuerySelectItem } from "@/components/ui/query-select";
import { regionLabels } from "@/data/regions";
import { getConditionPredictionStatus } from "@/src/lib/condition-presentation";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
import { formatGridDimensions } from "@/src/lib/map-grid";
import { calculateSuitability } from "@/src/lib/scoring";
import { speciesMapHref } from "@/src/lib/species-map-pages";
import { getSuitabilityBand } from "@/src/lib/suitability-scale";
import { queueUmamiEvent, UMAMI_EVENTS } from "@/src/lib/umami-goals";
import type {
  ConditionSnapshot,
  GlobalSpeciesScore,
  MapViewMode,
  PredictionCell,
  RegionId,
  SpatialBounds,
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
  territorialBounds,
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
  territorialBounds?: SpatialBounds;
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
  const detailPanelId = useId();
  const mapInfoPanelId = useId();
  const [infoOpen, setInfoOpen] = useState(false);
  const [viewportStatus, setViewportStatus] = useState<PredictionViewportStatus>(null);
  const [detailPanelState, setDetailPanelState] = useState({
    speciesId: speciesKey,
    open: false,
  });
  const detailOpen = detailPanelState.speciesId === speciesKey && detailPanelState.open;
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
  const trackCellClick = useCallback(() => {
    queueUmamiEvent(UMAMI_EVENTS.mapCellClick);
  }, []);
  const trackGeolocationSuccess = useCallback(() => {
    queueUmamiEvent(UMAMI_EVENTS.mapGeolocationSuccess);
  }, []);
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
  const selectedEffectiveHabitat = selectedCell && typeof result.effectiveHabitatCoverage === "number"
    ? result.effectiveHabitatCoverage
    : undefined;
  const isLoadingCell = cellDetailState.status === "loading";
  const isLoadedCell = cellDetailState.status === "ready" &&
    Boolean(selectedCell ?? emptySelection);
  const hasCellLoadError = cellDetailState.status === "error";
  const selectedGridSizeM = cellDetailState.gridSizeM ?? selectedCell?.gridSizeM ??
    emptySelection?.gridSizeM;
  const displayedScore = emptySelection
    ? emptySelection.score
    : hasPrediction
      ? result.score
      : null;
  const displayedBand = displayedScore === null
    ? undefined
    : getSuitabilityBand(displayedScore);
  const speciesName = (speciesId: string) => speciesNames?.[speciesId] ?? speciesId;
  const topSpeciesId = selectedTopSpecies[0]?.speciesId;
  // The floating card stays compact; the full ranking renders below the map.
  const runnersUp = selectedTopSpecies.slice(1, 3);
  const [CellScoreHistory, setCellScoreHistory] = useState<
    (typeof import("@/components/cell-score-history"))["CellScoreHistory"]
  >();
  useEffect(() => {
    if (!selectedCell) return;
    let cancelled = false;
    void import("@/components/cell-score-history").then((module) => {
      if (!cancelled) setCellScoreHistory(() => module.CellScoreHistory);
    });
    return () => { cancelled = true; };
  }, [selectedCell]);
  const unavailableCopy = isLoadingCell
    ? "Carregant les condicions d’aquest sector…"
    : hasCellLoadError
      ? "No s’han pogut carregar les dades d’aquest sector. Torna-ho a provar."
    : predictionStatus.kind === "environment-unavailable"
    ? "sense lectures recents suficients"
    : selectedCell
      ? "valoració no disponible"
      : "selecciona un sector per veure’n les condicions";

  return <>
    <div ref={mapStage} className="map-stage">
      <RegionMap
        activeRegions={species?.ecologicalConfig.regions ?? allRegionIds}
        autoGeolocate={autoGeolocate}
        focusBounds={territorialBounds}
        selectedRegion={region}
        speciesId={speciesKey}
        mode={mode}
        predictionAvailable={species ? species.predictionMode === "current" : true}
        showReadyStatus={false}
        selectedCellId={selectedCellId}
        onCellClick={trackCellClick}
        onGeolocationSuccess={trackGeolocationSuccess}
        onCellSelect={selectCell}
        onCellDetailStateChange={updateCellDetailState}
        onViewportStatusChange={mode === "prediction" ? setViewportStatus : undefined}
        className="full-map"
        fullscreenTarget="parent"
      />
      <label className="map-fullscreen-species-control">
        <span>Espècie</span>
        <QuerySelect
          value={speciesKey}
          items={speciesItems}
          fallbackPath="/map"
          portalContainer={mapStage}
          analyticsEvent={UMAMI_EVENTS.mapChangeSpecies}
          aria-label="Canvia l’espècie del mapa en pantalla completa"
        />
      </label>
      <aside
        id={mapInfoPanelId}
        className="map-info-panel"
        aria-label="Informació per interpretar el mapa"
        hidden={!infoOpen}
      >
        <header>
          <div>
            <span>Informació</span>
            <strong>Sobre aquest mapa</strong>
          </div>
          <button
            type="button"
            aria-label="Tanca la informació del mapa"
            onClick={() => setInfoOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="map-info-panel-content">{info}</div>
      </aside>
      {mode === "prediction" ? (
        <aside
          className={`map-detail-panel${detailOpen ? " is-open" : ""}`}
          aria-label={globalMode ? "Informació del sector" : "Condicions del sector"}
        >
          <div className="map-floating-card" aria-live="polite">
            <div className="map-floating-card-context">
              <div className="map-floating-card-label">
                <MapIcon size={17} aria-hidden="true" />
                <span>{selectedGridSizeM ? `Sector ${formatGridDimensions(selectedGridSizeM)}` : regionLabels[region]}</span>
              </div>
              {isLoadingCell || isLoadedCell || hasCellLoadError ? (
                <span
                  className={`map-floating-card-status ${isLoadingCell ? "is-loading" : hasCellLoadError ? "is-error" : "is-ready"}`}
                  role="status"
                  aria-live="polite"
                >
                  {isLoadingCell ? <LoaderCircle size={14} aria-hidden="true" /> : isLoadedCell ? <CheckCircle2 size={14} aria-hidden="true" /> : null}
                  {isLoadingCell ? "Carregant dades" : isLoadedCell ? "Dades carregades" : "No s’ha pogut carregar"}
                </span>
              ) : null}
            </div>
            <div className="map-score-reading">
              <strong>{displayedScore === null ? "—" : <>{displayedScore}<small>/100</small></>}</strong>
              {displayedScore !== null ? (
                <span
                  className="map-score-meter"
                  role="meter"
                  aria-label={`Valoració del sector: ${displayedScore} sobre 100`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={displayedScore}
                >
                  <i
                    style={{
                      backgroundColor: displayedBand?.color,
                      width: `${displayedScore}%`,
                    }}
                  />
                </span>
              ) : null}
            </div>
            {emptySelection ? (
              <p>{emptySelection.score === 0
                ? "Cap espècie comestible té condicions favorables en aquest sector ara mateix."
                : "Falten lectures recents per valorar aquest sector."}</p>
            ) : hasPrediction ? (
              <div className="map-condition-summary">
                {globalMode ? (
                  <strong>{selectedCell && topSpeciesId
                    ? `Millor opció · ${speciesName(topSpeciesId)}`
                    : regionalTopSpeciesName
                      ? `Millor opció · ${regionalTopSpeciesName}`
                      : "Espècie amb millors condicions"}</strong>
                ) : null}
                <div className="map-condition-metrics">
                  <span className="map-condition-band">
                    {result.label}
                  </span>
                  {result.fruitingConditionsScore !== null ? (
                    <span><Clock3 size={14} aria-hidden="true" />Condicions <strong>{result.fruitingConditionsScore}/100</strong></span>
                  ) : null}
                  {!globalMode && selectedEffectiveHabitat !== undefined ? (
                    <span><Trees size={14} aria-hidden="true" />Terreny <strong>{Math.round(selectedEffectiveHabitat * 100)}%</strong></span>
                  ) : null}
                </div>
                {globalMode && runnersUp.length ? (
                  <p>{`També: ${runnersUp
                    .map((item) => `${speciesName(item.speciesId)} ${item.score}`)
                    .join(" · ")}`}</p>
                ) : null}
              </div>
            ) : viewportStatus ? (
              <div className="map-condition-summary map-viewport-status" role="status">
                <strong>{viewportStatus.title}</strong>
                <p>{viewportStatus.detail}</p>
              </div>
            ) : <p>{unavailableCopy}</p>}
            <div className="map-footer-actions">
              <button
                type="button"
                className="map-info-button"
                aria-controls={mapInfoPanelId}
                aria-expanded={infoOpen}
                aria-label="Obre la informació del mapa"
                onClick={() => {
                  setDetailPanelState({ speciesId: speciesKey, open: false });
                  setInfoOpen(true);
                }}
              >
                <Info size={16} aria-hidden="true" />
                Informació
              </button>
              {!globalMode || topSpeciesId ? (
                <button
                  type="button"
                  className="map-detail-toggle"
                  aria-controls={detailPanelId}
                  aria-expanded={detailOpen}
                  onClick={(event) => {
                    event.currentTarget.blur();
                    setInfoOpen(false);
                    setDetailPanelState({
                      speciesId: speciesKey,
                      open: !detailOpen,
                    });
                  }}
                >
                  {detailOpen ? <X size={16} aria-hidden="true" /> : <ListFilter size={16} aria-hidden="true" />}
                  {detailOpen ? "Tanca" : "Detalls"}
                </button>
              ) : null}
            </div>
          </div>
          <div id={detailPanelId} className="map-detail-panel-content" hidden={!detailOpen}>
            {!globalMode ? (
              <>
                {selectedCell && CellScoreHistory ? <CellScoreHistory key={`${species!.speciesId}:${selectedCell.cellId}`} speciesId={species!.speciesId} cell={selectedCell} /> : null}
                <ConditionComparison
                  expanded
                  species={species!}
                  snapshot={snapshot}
                  result={result}
                  cellId={selectedCell?.cellId}
                  cellGridSizeM={selectedCell?.gridSizeM}
                  cellBounds={selectedCell?.cellBounds}
                />
              </>
            ) : null}
            {globalMode && selectedCell && topSpeciesId ? (
              <section className="map-global-top-species" aria-label="Espècies amb millors condicions al sector">
                <div>
                  <p className="eyebrow">Espècies amb condicions favorables en aquest sector</p>
                  <ol className="map-global-species-list">
                    {selectedTopSpecies.map((item) => (
                      <li key={item.speciesId}>
                        <i
                          style={{ backgroundColor: getSuitabilityBand(item.score).color }}
                          aria-hidden
                        />
                        <Link href={speciesMapHref(item.speciesId, { region })}>
                          {speciesName(item.speciesId)}
                        </Link>
                        <strong>{item.score}<small>/100</small></strong>
                      </li>
                    ))}
                  </ol>
                </div>
                <p>
                  La lectura correspon a <strong>{speciesName(topSpeciesId)}</strong>,
                  l’espècie amb les millors condicions dins d’aquest sector.{" "}
                  <Link href={speciesMapHref(topSpeciesId, { region })} className="text-link">
                    Veure el mapa complet <ArrowUpRight size={15} />
                  </Link>
                </p>
                {CellScoreHistory ? <CellScoreHistory
                  key={`${topSpeciesId}:${selectedCell.cellId}`}
                  speciesId={topSpeciesId}
                  cell={selectedCell}
                /> : null}
              </section>
            ) : null}
          </div>
        </aside>
      ) : (
        <aside className="map-detail-panel map-info-only-footer" aria-label="Informació del mapa">
          <div className="map-floating-card">
            <div className="map-floating-card-label">
              <MapIcon size={17} aria-hidden="true" />
              <span>{regionLabels[region]}</span>
            </div>
            <p>Terreny adequat · consulta la guia per interpretar aquesta vista.</p>
            <div className="map-footer-actions">
              <button
                type="button"
                className="map-info-button"
                aria-controls={mapInfoPanelId}
                aria-expanded={infoOpen}
                aria-label="Obre la informació del mapa"
                onClick={() => setInfoOpen(true)}
              >
                <Info size={16} aria-hidden="true" />
                Informació
              </button>
            </div>
          </div>
        </aside>
      )}
    </div>
  </>;
}
