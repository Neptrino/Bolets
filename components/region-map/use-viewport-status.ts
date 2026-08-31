"use client";

import { useEffect } from "react";
import { habitatEvidenceCopy, mapStatusCopy } from "./status";
import type {
  CellState,
  HabitatEvidenceState,
} from "./support";
import type { PredictionViewportStatus } from "./types";

export function useRegionMapStatus({
  cellState,
  globalPrediction,
  habitat,
  habitatEvidenceState,
  onViewportStatusChange,
  showCompatibility,
  showReadyStatus,
  speciesId,
}: {
  cellState: CellState;
  globalPrediction: boolean;
  habitat: boolean;
  habitatEvidenceState: HabitatEvidenceState;
  onViewportStatusChange?: (status: PredictionViewportStatus) => void;
  showCompatibility: boolean;
  showReadyStatus: boolean;
  speciesId?: string;
}) {
  const statusCopy = mapStatusCopy({
    cellState,
    globalPrediction,
    showCompatibility,
  });
  const statusVisible = Boolean(speciesId && !habitat &&
    (cellState.status !== "ready" || showReadyStatus));
  const title = statusVisible ? statusCopy.title : null;
  const detail = statusVisible ? statusCopy.detail : null;

  useEffect(() => {
    onViewportStatusChange?.(title && detail ? { title, detail } : null);
  }, [detail, onViewportStatusChange, title]);

  return {
    evidenceCopy: habitatEvidenceCopy(habitatEvidenceState),
    statusCopy,
  };
}
