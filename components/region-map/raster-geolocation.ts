import { latLng, latLngBounds, type Map as LeafletMap } from "./leaflet-raster";
import { regionMapPanBounds } from "@/src/lib/map-view-bounds";
import { MapEvents, type LocationEvents, type RegionGeolocateControl } from "./map-adapter";
import { addMapButtons, mapButton } from "./raster-controls";

/** Coordinates and the location watch live only for this mounted map. */
export class RasterGeolocateControl extends MapEvents<LocationEvents> implements RegionGeolocateControl {
  private watch?: number;
  private disposed = false;
  private following = false;
  private movingToLocation = false;
  private position?: GeolocationPosition;
  private overlay = document.createElement("div");
  private accuracy = document.createElement("div");
  private dot = document.createElement("div");
  private button = mapButton("Mostra la meva ubicació", "maplibregl-ctrl-geolocate", () => this.trigger());
  private removeButton: () => void;
  constructor(private map: LeafletMap, private habitat: boolean) {
    super();
    this.overlay.className = "raster-geolocation";
    this.overlay.hidden = true;
    this.overlay.setAttribute("aria-hidden", "true");
    this.dot.className = "maplibregl-user-location-dot";
    this.accuracy.className = "maplibregl-user-location-accuracy-circle";
    this.overlay.append(this.accuracy, this.dot);
    this.removeButton = addMapButtons(map, [this.button]);
    map.on("move resize", this.draw);
    map.on("movestart", this.stopFollowing);
    map.on("dragstart", this.userMoved);
    map.on("moveend", this.finishedMoving);
    map.getContainer().addEventListener("wheel", this.userMoved, { passive: true });
    if (!navigator.geolocation) this.button.disabled = true;
  }
  private stopFollowing = () => {
    if (!this.movingToLocation) this.setFollowing(false);
  };
  private userMoved = () => { this.movingToLocation = false; this.setFollowing(false); };
  private setFollowing(following: boolean) {
    this.following = following;
    this.button.setAttribute("aria-pressed", String(following));
    this.button.classList.toggle("maplibregl-ctrl-geolocate-active", following);
    this.button.classList.toggle("maplibregl-ctrl-geolocate-background", !following && this.watch !== undefined);
  }
  private finishedMoving = () => { this.movingToLocation = false; };
  private draw = () => {
    if (!this.position) return;
    if (!this.overlay.isConnected) this.map.getContainer().parentElement?.append(this.overlay);
    const { latitude, longitude, accuracy } = this.position.coords;
    const location = latLng(latitude, longitude);
    const center = this.map.latLngToContainerPoint(location);
    const east = this.map.latLngToContainerPoint(location.toBounds(accuracy * 2).getNorthEast());
    const radius = Math.abs(east.x - center.x);
    this.overlay.hidden = false;
    this.dot.style.left = `${center.x}px`; this.dot.style.top = `${center.y}px`;
    this.accuracy.style.left = `${center.x - radius}px`; this.accuracy.style.top = `${center.y - radius}px`;
    this.accuracy.style.width = `${radius * 2}px`; this.accuracy.style.height = `${radius * 2}px`;
  };
  private locate = (position: GeolocationPosition) => {
    if (this.disposed) return;
    this.position = position;
    const { latitude, longitude, accuracy } = position.coords;
    const bounds = latLngBounds(regionMapPanBounds.map(([lng, lat]) => [lat, lng]));
    if (!bounds.contains([latitude, longitude])) { this.emit("outofmaxbounds", undefined); return; }
    this.draw();
    if (this.following) {
      this.movingToLocation = true;
      this.map.flyToBounds(latLng(latitude, longitude).toBounds(Math.max(accuracy * 2, 50)), {
        maxZoom: (this.habitat ? 11.2 : 11.7) + 1, duration: .65, padding: [54, 54],
      });
    }
    this.emit("geolocate", position);
  };
  trigger() {
    if (!navigator.geolocation) { this.emit("error", undefined); return; }
    if (this.watch !== undefined && this.following) {
      navigator.geolocation.clearWatch(this.watch);
      this.watch = undefined; this.position = undefined;
      this.overlay.remove(); this.setFollowing(false);
      return;
    }
    this.setFollowing(true);
    if (this.watch !== undefined) { if (this.position) this.locate(this.position); return; }
    this.watch = navigator.geolocation.watchPosition(this.locate, (error) => {
      if (this.disposed) return;
      // Timeout/unavailable readings are transient: the same watch can recover.
      // Only a denied permission ends tracking; a later fix should still follow.
      if (error.code === 1) {
        if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch);
        this.watch = undefined;
        this.setFollowing(false);
      }
      this.emit("error", undefined);
    }, { enableHighAccuracy: !this.habitat, maximumAge: 30_000, timeout: this.habitat ? 3_000 : 8_000 });
  }
  remove() {
    this.disposed = true;
    if (this.watch !== undefined) navigator.geolocation.clearWatch(this.watch);
    this.watch = undefined; this.position = undefined;
    this.map.off("move resize", this.draw);
    this.map.off("movestart", this.stopFollowing);
    this.map.off("dragstart", this.userMoved);
    this.map.off("moveend", this.finishedMoving);
    this.map.getContainer().removeEventListener("wheel", this.userMoved);
    this.overlay.remove(); this.removeButton(); this.clearListeners();
  }
}
