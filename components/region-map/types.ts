import type {
  GlobalSpeciesScore,
  MapViewMode,
  PredictionCell,
  RegionId,
  SpatialBounds,
  SpatialGridSizeM,
} from "@/src/lib/types";
import type { PredictionRendering } from "@/components/region-map/prediction-surface";

export type PredictionCellDetailState = {
  status: "idle" | "loading" | "ready" | "error";
  cellId?: string;
  gridSizeM?: SpatialGridSizeM;
};

export type RegionMapProps = {
  activeRegions?: RegionId[];
  autoGeolocate?: boolean;
  compactLegend?: boolean;
  initialCentre?: [number, number];
  initialZoom?: number;
  interactive?: boolean;
  focusBounds?: SpatialBounds;
  selectedRegion?: RegionId;
  speciesId?: string;
  habitat?: boolean;
  mode?: MapViewMode;
  maximumPredictionGridSizeM?: SpatialGridSizeM;
  predictionAvailable?: boolean;
  predictionRendering?: PredictionRendering;
  showReadyStatus?: boolean;
  selectedCellId?: string;
  className?: string;
  fullscreenTarget?: "viewport" | "parent";
  onCellSelect?: (
    cell?: PredictionCell,
    topSpecies?: GlobalSpeciesScore[],
    combined?: {
      score: number | null;
      cellId: string;
      gridSizeM: SpatialGridSizeM;
    },
  ) => void;
  onCellDetailStateChange?: (state: PredictionCellDetailState) => void;
};
