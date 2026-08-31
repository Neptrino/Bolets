"use client";

import { LockKeyhole, MousePointerClick } from "lucide-react";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { useEffect, useRef } from "react";
import { RegionMapFrame } from "@/components/region-map/frame";
import { createRegionMap } from "@/components/region-map/map-instance";
import { basemapStyle } from "@/components/region-map/support";

export function FindingLocationPreview({
  latitude,
  longitude,
  onLocationChange,
}: {
  latitude: number;
  longitude: number;
  onLocationChange: (latitude: number, longitude: number) => void;
}) {
  const node = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const initialPosition = useRef({ latitude, longitude });
  const onLocationChangeRef = useRef(onLocationChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    if (!node.current || map.current) return;
    const initial = initialPosition.current;
    const { map: localMap } = createRegionMap({
      center: [initial.longitude, initial.latitude],
      container: node.current,
      habitat: false,
      interactive: true,
      showFullscreen: false,
      showNavigation: true,
      style: basemapStyle("icgc-muted"),
      useGeolocation: false,
      zoom: 11.8,
    });
    map.current = localMap;

    const markerNode = document.createElement("span");
    markerNode.className = "finding-location-preview-marker";
    markerNode.setAttribute("aria-hidden", "true");
    const localMarker = new Marker({ draggable: true, element: markerNode })
      .setLngLat([initial.longitude, initial.latitude])
      .addTo(localMap);
    marker.current = localMarker;

    const updateLocation = (nextLatitude: number, nextLongitude: number) => {
      localMarker.setLngLat([nextLongitude, nextLatitude]);
      onLocationChangeRef.current(
        Number(nextLatitude.toFixed(6)),
        Number(nextLongitude.toFixed(6)),
      );
    };
    const handleMapClick = (event: { lngLat: { lat: number; lng: number } }) => {
      updateLocation(event.lngLat.lat, event.lngLat.lng);
    };
    const handleMarkerDrag = () => {
      const next = localMarker.getLngLat();
      updateLocation(next.lat, next.lng);
    };
    localMap.on("click", handleMapClick);
    localMarker.on("dragend", handleMarkerDrag);

    const resizeObserver = new ResizeObserver(() => localMap.resize());
    resizeObserver.observe(node.current);

    return () => {
      resizeObserver.disconnect();
      localMap.off("click", handleMapClick);
      localMarker.off("dragend", handleMarkerDrag);
      marker.current?.remove();
      marker.current = null;
      localMap.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    map.current?.jumpTo({ center: [longitude, latitude] });
    marker.current?.setLngLat([longitude, latitude]);
  }, [latitude, longitude]);

  return (
    <figure className="finding-location-preview">
      <RegionMapFrame
        ariaLabel="Mapa editable de la ubicació privada de la troballa"
        basemapId="icgc-muted"
        className="finding-location-preview-map"
        map={map}
        mapMode="private-location-preview"
        node={node}
        showResetButton={false}
      >
        <p className="finding-location-preview-hint"><MousePointerClick size={16} aria-hidden="true" /> Fes clic o toca el mapa per moure el punt</p>
      </RegionMapFrame>
      <figcaption>
        <span><MousePointerClick size={15} aria-hidden="true" /><span><strong>Corregeix el punt directament al mapa.</strong> Pots ampliar, desplaçar el mapa o arrossegar el marcador.</span></span>
        <span><LockKeyhole size={15} aria-hidden="true" /> Aquesta ubicació és privada. El mapa públic només mostra una zona aproximada de 10 × 10 km.</span>
      </figcaption>
    </figure>
  );
}
