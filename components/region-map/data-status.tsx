import { Grid3X3, LoaderCircle } from "lucide-react";
import type { CellState } from "./support";
import type { MapStatusCopy } from "./status";

export function RegionMapDataStatus({
  cellState,
  compactLegend,
  gridDimensions,
  habitat,
  showCompatibility,
  speciesId,
  statusCopy,
}: {
  cellState: CellState;
  compactLegend: boolean;
  gridDimensions: string;
  habitat: boolean;
  showCompatibility: boolean;
  speciesId?: string;
  statusCopy: MapStatusCopy;
}) {
  if (habitat && cellState.status === "loading") {
    return (
      <div className="habitat-map-loading" aria-hidden="true">
        <LoaderCircle size={16} />
        <span>Carregant mapa i zones compatibles…</span>
      </div>
    );
  }

  if (speciesId && !habitat && cellState.status === "loading") {
    return (
      <div className="prediction-map-loading" role="status" aria-live="polite">
        <div>
          <LoaderCircle size={24} aria-hidden />
          <strong>
            {showCompatibility
              ? "Actualitzant la compatibilitat…"
              : "Actualitzant la predicció…"}
          </strong>
          <span>
            {showCompatibility
              ? `Carregant les zones compatibles de ${gridDimensions} per a aquesta espècie.`
              : `Carregant les cel·les de ${gridDimensions} per a aquesta espècie.`}
          </span>
        </div>
      </div>
    );
  }

  if (speciesId && !habitat) {
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
          <strong>Resolució actual: {gridDimensions}</strong>
        </div>
      </div>
    );
  }

  return null;
}
