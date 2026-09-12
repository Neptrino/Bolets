import { Control, DomEvent, type Map as LeafletMap } from "leaflet";

export function mapButton(label: string, className: string, action: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.title = label;
  button.setAttribute("aria-label", label);
  const icon = document.createElement("span");
  icon.className = "maplibregl-ctrl-icon";
  icon.setAttribute("aria-hidden", "true");
  button.append(icon);
  button.addEventListener("click", action);
  return button;
}

export function addMapButtons(map: LeafletMap, buttons: HTMLButtonElement[]) {
  const group = document.createElement("div");
  group.className = "maplibregl-ctrl maplibregl-ctrl-group";
  group.append(...buttons);
  DomEvent.disableClickPropagation(group);
  DomEvent.disableScrollPropagation(group);
  const control = new Control({ position: "topright" });
  control.onAdd = () => group;
  control.addTo(map);
  return () => control.remove();
}

export function addRasterNavigation(map: LeafletMap) {
  const zoom = (delta: number) => map.flyTo(map.getCenter(), Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + delta)), { duration: .3 });
  return addMapButtons(map, [
    mapButton("Apropar", "maplibregl-ctrl-zoom-in", () => zoom(1)),
    mapButton("Allunyar", "maplibregl-ctrl-zoom-out", () => zoom(-1)),
  ]);
}

export function addRasterFullscreen(map: LeafletMap, target: HTMLElement) {
  let pseudo = false;
  let savedOverflow = "";
  const update = () => {
    const full = document.fullscreenElement === target || pseudo;
    const label = full ? "Sortir de pantalla completa" : "Veure el mapa a pantalla completa";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.classList.toggle("maplibregl-ctrl-shrink", full);
    button.classList.toggle("maplibregl-ctrl-fullscreen", !full);
    map.invalidateSize();
  };
  const button = mapButton("Veure el mapa a pantalla completa", "maplibregl-ctrl-fullscreen", () => {
    if (document.fullscreenEnabled) {
      void (document.fullscreenElement === target ? document.exitFullscreen() : target.requestFullscreen()).catch(() => undefined);
    } else {
      pseudo = !pseudo;
      if (pseudo) savedOverflow = document.body.style.overflow;
      document.body.style.overflow = pseudo ? "hidden" : savedOverflow;
      target.classList.toggle("maplibregl-pseudo-fullscreen", pseudo);
      update();
    }
  });
  const remove = addMapButtons(map, [button]);
  const escape = (event: KeyboardEvent) => {
    if (event.key === "Escape" && pseudo) {
      pseudo = false;
      target.classList.remove("maplibregl-pseudo-fullscreen");
      document.body.style.overflow = savedOverflow;
      update();
    }
  };
  document.addEventListener("fullscreenchange", update);
  document.addEventListener("keydown", escape);
  return () => {
    document.removeEventListener("fullscreenchange", update);
    document.removeEventListener("keydown", escape);
    if (pseudo) { target.classList.remove("maplibregl-pseudo-fullscreen"); document.body.style.overflow = savedOverflow; }
    if (document.fullscreenElement === target) void document.exitFullscreen().catch(() => undefined);
    remove();
  };
}
