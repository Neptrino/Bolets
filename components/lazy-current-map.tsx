"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { GLOBAL_SPECIES_ID } from "@/src/lib/global-map";
import type { RegionId } from "@/src/lib/types";

const CurrentRegionMap = dynamic(
  () => import("@/components/region-map/interactive-map").then((module) => module.RegionMap),
  { ssr: false, loading: () => <CurrentMapPlaceholder /> },
);

function CurrentMapPlaceholder() {
  return <div className="current-map-placeholder" role="status">
    El mapa de les condicions d’avui es carregarà quan t’hi acostis…
  </div>;
}

export function LazyCurrentMap({ activeRegions }: { activeRegions: RegionId[] }) {
  const boundary = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);

  useEffect(() => {
    const node = boundary.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setNearViewport(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      setNearViewport(true);
      observer.disconnect();
    }, { rootMargin: "200px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return <div ref={boundary} className="current-map-frame">
    {nearViewport ? <CurrentRegionMap
      activeRegions={activeRegions}
      autoGeolocate={false}
      className="current-production-map"
      compactLegend
      interactive={false}
      maximumPredictionGridSizeM={2500}
      mode="prediction"
      predictionAvailable
      predictionRendering="heatmap"
      showTimeline
      showReadyStatus={false}
      speciesId={GLOBAL_SPECIES_ID}
    /> : <CurrentMapPlaceholder />}
  </div>;
}
