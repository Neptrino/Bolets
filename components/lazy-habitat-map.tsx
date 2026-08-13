"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { HabitatMapLegend } from "@/components/habitat-map-legend";
import type { RegionId } from "@/src/lib/types";

const HabitatRegionMap = dynamic(
  () =>
    import("@/components/region-map").then((module) => module.RegionMap),
  {
    loading: () => <HabitatMapPlaceholder loading />,
    ssr: false,
  },
);

function HabitatMapPlaceholder({
  compactLegend = false,
  loading = false,
}: {
  compactLegend?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className="region-map region-map-habitat species-map"
      role="region"
      aria-busy="true"
      aria-label="Mapa de compatibilitat ecològica de Catalunya"
    >
      <div className="region-map-viewport">
        <div className="habitat-map-loading" role="status" aria-live="polite">
          <span>
            {loading
              ? "Carregant el mapa de compatibilitat…"
              : "El mapa es carregarà quan t’hi acostis…"}
          </span>
        </div>
      </div>
      <HabitatMapLegend compact={compactLegend} hidden />
    </div>
  );
}

export function LazyHabitatMap({
  activeRegions,
  autoGeolocate = true,
  compactLegend = false,
  initialCentre,
  initialZoom,
  selectedRegion,
  speciesId,
}: {
  activeRegions: RegionId[];
  autoGeolocate?: boolean;
  compactLegend?: boolean;
  initialCentre?: [number, number];
  initialZoom?: number;
  selectedRegion: RegionId;
  speciesId: string;
}) {
  const boundary = useRef<HTMLDivElement>(null);
  const [isNearViewport, setIsNearViewport] = useState(false);
  const [reservedHeight, setReservedHeight] = useState<number>();

  useEffect(() => {
    const node = boundary.current;
    if (!node || isNearViewport) return;

    if (!("IntersectionObserver" in window)) {
      setReservedHeight(node.getBoundingClientRect().height);
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setReservedHeight(node.getBoundingClientRect().height);
        setIsNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "1200px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isNearViewport]);

  return (
    <div ref={boundary} style={{ minHeight: reservedHeight }}>
      {isNearViewport ? (
        <HabitatRegionMap
          activeRegions={activeRegions}
          autoGeolocate={autoGeolocate}
          compactLegend={compactLegend}
          initialCentre={initialCentre}
          initialZoom={initialZoom}
          selectedRegion={selectedRegion}
          speciesId={speciesId}
          habitat
          className="species-map"
        />
      ) : (
        <HabitatMapPlaceholder compactLegend={compactLegend} />
      )}
    </div>
  );
}
