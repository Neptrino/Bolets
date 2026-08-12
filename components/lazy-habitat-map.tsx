"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { RegionId } from "@/src/lib/types";

const HabitatRegionMap = dynamic(
  () =>
    import("@/components/region-map").then((module) => module.RegionMap),
  {
    loading: () => <HabitatMapPlaceholder loading />,
    ssr: false,
  },
);

function HabitatMapPlaceholder({ loading = false }: { loading?: boolean }) {
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
      <aside className="habitat-map-legend" aria-hidden="true">
        <div className="habitat-map-legend-heading">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" />
            <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          </svg>
          <div>
            <strong>Coberta del sòl, altitud i pH compatibles</strong>
            <span>
              —— sectors de 2,5 km × 2,5 km amb alguna cel·la base compatible.
              Apropa per veure la graella de 250 m.
            </span>
          </div>
        </div>
        <div className="habitat-map-legend-items">
          <div className="habitat-map-legend-item">
            <i className="habitat-coverage-swatch" aria-hidden />
            <div>
              <strong>Blau · zones compatibles</strong>
              <span>
                Més intensitat indica més cobertura; els límits d’altitud es
                suavitzen.
              </span>
            </div>
          </div>
          <div className="habitat-map-legend-item">
            <i className="habitat-history-swatch" aria-hidden />
            <div>
              <strong>Ratllat lila · registres històrics</strong>
              <span>
                Context històric; no amplia les zones compatibles. —— registres
                en — quadrícules de 10 km; —— sectors coincideixen.
              </span>
            </div>
          </div>
        </div>
        <p className="habitat-map-legend-note">
          Aquest mapa no indica presència actual ni si les condicions de
          fructificació són bones avui.
        </p>
      </aside>
    </div>
  );
}

export function LazyHabitatMap({
  activeRegions,
  selectedRegion,
  speciesId,
}: {
  activeRegions: RegionId[];
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
          selectedRegion={selectedRegion}
          speciesId={speciesId}
          habitat
          className="species-map"
        />
      ) : (
        <HabitatMapPlaceholder />
      )}
    </div>
  );
}
