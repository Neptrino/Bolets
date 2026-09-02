import {
  FullscreenControl,
  GeolocateControl,
  Map as MapLibre,
  NavigationControl,
  type StyleSpecification,
} from "maplibre-gl";
import { regionMapPanBounds } from "@/src/lib/map-view-bounds";

export function regionMapMaxBounds(interactive: boolean) {
  return interactive ? regionMapPanBounds : undefined;
}

export function createRegionMap({
  center,
  container,
  fullscreenContainer,
  habitat,
  interactive = true,
  showFullscreen = true,
  showNavigation = true,
  style,
  useGeolocation,
  zoom,
}: {
  center: [number, number];
  container: HTMLElement;
  fullscreenContainer?: HTMLElement;
  habitat: boolean;
  interactive?: boolean;
  showFullscreen?: boolean;
  showNavigation?: boolean;
  style: StyleSpecification;
  useGeolocation: boolean;
  zoom: number;
}) {
  const map = new MapLibre({
    container,
    style,
    center,
    zoom,
    attributionControl: { compact: true },
    maplibreLogo: false,
    maxBounds: regionMapMaxBounds(interactive),
    interactive,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    locale: {
      "NavigationControl.ZoomIn": "Apropar",
      "NavigationControl.ZoomOut": "Allunyar",
      "FullscreenControl.Enter": "Veure el mapa a pantalla completa",
      "FullscreenControl.Exit": "Sortir de pantalla completa",
      "GeolocateControl.FindMyLocation": "Mostra la meva ubicació",
      "GeolocateControl.LocationNotAvailable": "Ubicació no disponible",
      "AttributionControl.ToggleAttribution": "Mostra l’atribució del mapa",
    },
  });
  if (showNavigation) {
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
  }
  if (showFullscreen) {
    map.addControl(
      new FullscreenControl(
        fullscreenContainer ? { container: fullscreenContainer } : undefined,
      ),
      "top-right",
    );
  }

  const geolocate = useGeolocation
    ? new GeolocateControl({
        positionOptions: {
          enableHighAccuracy: !habitat,
          maximumAge: 30_000,
          timeout: habitat ? 3_000 : 8_000,
        },
        fitBoundsOptions: {
          // Start within the public 2.5 km band; finer detail is a manual choice.
          maxZoom: habitat ? 11.2 : 11.7,
          duration: 650,
        },
        trackUserLocation: true,
        showAccuracyCircle: true,
        showUserLocation: true,
      })
    : undefined;
  if (geolocate) map.addControl(geolocate, "top-right");

  return { geolocate, map };
}
