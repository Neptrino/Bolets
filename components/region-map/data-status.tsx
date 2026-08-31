import { Grid3X3, LoaderCircle } from "lucide-react";
import { formatCellCount, type CellState } from "./support";
import type { MapStatusCopy } from "./status";

export function RegionMapDataStatus({
  cellState,
  compactLegend,
  habitat,
  showCompatibility,
  showReadyStatus,
  speciesId,
  statusCopy,
}: {
  cellState: CellState;
  compactLegend: boolean;
  habitat: boolean;
  showCompatibility: boolean;
  showReadyStatus: boolean;
  speciesId?: string;
  statusCopy: MapStatusCopy;
}) {
  if (habitat && cellState.status === "loading") {
    return (
      <div className="habitat-map-loading" aria-hidden="true">
        <LoaderCircle size={16} />
        <span>Carregant el mapa i el terreny adequat…</span>
      </div>
    );
  }

  const loadedCellCount =
    cellState.published + cellState.excluded + cellState.withheld;

  if (
    speciesId &&
    !habitat &&
    cellState.status === "loading" &&
    loadedCellCount === 0
  ) {
    return (
      <div className="prediction-map-loading" role="status" aria-live="polite">
        <div>
          <LoaderCircle size={24} aria-hidden />
          <strong>
            {showCompatibility
              ? "Actualitzant el terreny adequat…"
              : "Actualitzant les condicions…"}
          </strong>
          <span>
            {showCompatibility
              ? "Carregant el terreny que encaixa amb aquesta espècie."
              : "Carregant les condicions d’aquesta zona."}
          </span>
        </div>
      </div>
    );
  }

  if (speciesId && !habitat && cellState.status === "loading") {
    return (
      <div
        className="map-data-state map-refining-state"
        role="status"
        aria-live="polite"
      >
        <LoaderCircle size={18} aria-hidden />
        <div>
          <strong>Completant el mapa…</strong>
          <span>
            {formatCellCount(loadedCellCount)} preparats.
          </span>
        </div>
      </div>
    );
  }

  if (speciesId && !habitat) {
    if (cellState.status === "ready" && !showReadyStatus) return null;
    return (
      <div className="map-data-state" aria-live="polite">
        <Grid3X3 size={18} aria-hidden />
        <div>
          <strong>{statusCopy.title}</strong>
          <span>{statusCopy.detail}</span>
        </div>
      </div>
    );
  }

  if (habitat && compactLegend && cellState.status === "ready") {
    return (
      <div className="map-data-state map-resolution-state" aria-live="polite">
        <Grid3X3 size={18} aria-hidden />
        <div>
          <strong>Apropa el mapa per veure més detall</strong>
        </div>
      </div>
    );
  }

  return null;
}
