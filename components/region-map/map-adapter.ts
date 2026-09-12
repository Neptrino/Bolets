import type { StyleSpecification } from "maplibre-gl";

export type MapCoordinate = [number, number];
export type MapBounds = [MapCoordinate, MapCoordinate];
export type MapPadding = { top: number; right: number; bottom: number; left: number };
export type RegionMapMouseEvent = { lngLat: { lng: number; lat: number } };
export type RegionMapEvents = {
  click: RegionMapMouseEvent;
  mousemove: RegionMapMouseEvent;
  load: undefined;
  "style.load": undefined;
  move: undefined;
  movestart: undefined;
  moveend: undefined;
  zoom: undefined;
  resize: undefined;
};
export interface MapEventSource<Events> {
  on<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): void;
  off<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): void;
  once<K extends keyof Events>(type: K, listener: (event: Events[K]) => void): void;
}
export type LocationEvents = {
  geolocate: { coords: GeolocationCoordinates };
  error: undefined;
  outofmaxbounds: undefined;
};
export interface RegionGeolocateControl extends MapEventSource<LocationEvents> {
  trigger(): void;
}

/** The map operations used by the shared prediction/habitat renderer. */
export interface RegionMapAdapter extends MapEventSource<RegionMapEvents> {
  project(coordinate: MapCoordinate): { x: number; y: number };
  getCenter(): { lng: number; lat: number };
  getZoom(): number;
  getBearing(): number;
  getPitch(): number;
  getPadding(): Partial<MapPadding>;
  getBounds(): { getWest(): number; getEast(): number; getNorth(): number; getSouth(): number };
  getCanvas(): HTMLElement;
  isMoving(): boolean;
  loaded(): boolean;
  jumpTo(options: { center: MapCoordinate; zoom: number }): void;
  fitBounds(bounds: MapBounds, options?: { padding?: MapPadding | number; duration?: number; maxZoom?: number }): void;
  setStyle(style: StyleSpecification): void;
  resize(): void;
  remove(): void;
}

export class MapEvents<Events> implements MapEventSource<Events> {
  private listeners = new Map<keyof Events, Set<(event: never) => void>>();
  on<K extends keyof Events>(type: K, listener: (event: Events[K]) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  off<K extends keyof Events>(type: K, listener: (event: Events[K]) => void) {
    this.listeners.get(type)?.delete(listener);
    this.onceListeners.get(type)?.delete(listener);
  }
  once<K extends keyof Events>(type: K, listener: (event: Events[K]) => void) {
    const listeners = this.onceListeners.get(type) ?? new Set();
    listeners.add(listener);
    this.onceListeners.set(type, listeners);
  }
  private onceListeners = new Map<keyof Events, Set<(event: never) => void>>();
  protected emit<K extends keyof Events>(type: K, event: Events[K]) {
    const once = this.onceListeners.get(type) ?? [];
    this.onceListeners.delete(type);
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event as never);
    for (const listener of once) listener(event as never);
  }
  protected clearListeners() { this.listeners.clear(); this.onceListeners.clear(); }
}
