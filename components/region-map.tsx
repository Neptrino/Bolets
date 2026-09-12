"use client";

import dynamic from "next/dynamic";
import type { RegionMapProps } from "@/components/region-map/types";

export type { PredictionCellDetailState, PredictionViewportStatus } from "@/components/region-map/types";

export const RegionMap = dynamic<RegionMapProps>(
  () => import("@/components/region-map/interactive-map").then(module => module.RegionMap),
  {
    ssr: true,
    loading: () => <div className="region-map full-map" aria-busy="true" role="region" aria-label="Mapa de bolets">
      <div className="region-map-viewport">
        <div className="prediction-map-loading" role="status"><div>Carregant el mapa…</div></div>
      </div>
    </div>,
  },
);
