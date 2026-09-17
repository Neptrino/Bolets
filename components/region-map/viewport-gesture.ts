import type { RegionMapAdapter } from "./map-adapter";

/** Any fixed coordinate serves as the shared anchor for the transform maths. */
export const VIEWPORT_ANCHOR: [number, number] = [1.7, 41.8];

type PaintedView = { zoom: number; anchor: { x: number; y: number } };

const northUp = (map: RegionMapAdapter) => map.getBearing() === 0 && map.getPitch() === 0;

/**
 * Between movestart and moveend a north-up Mercator map only translates and
 * scales what was last painted, so the frame follows the gesture through a
 * CSS transform instead of a full repaint on every animation frame. Painting
 * a viewport-sized canvas per frame kept the main thread busy for the whole
 * pinch and well after it, which is where taps collected their input delay.
 * The owner paints again once the gesture settles; until then the last frame
 * stays attached to the ground.
 */
export function createViewportGesture({ map, canvases, repaint }: {
  map: RegionMapAdapter;
  canvases: () => Array<HTMLCanvasElement | null>;
  repaint: () => void;
}) {
  let painted: PaintedView | undefined;
  let settled = true;
  let frame: number | undefined;
  const elements = () => canvases().filter((canvas): canvas is HTMLCanvasElement => canvas !== null);
  const onMoveStart = () => {
    for (const canvas of elements()) canvas.style.willChange = "transform";
  };
  const onMoveEnd = () => {
    // Owners normally repaint from their own moveend work (new buckets or
    // tiles). This covers a settled view whose data was already loaded and
    // would otherwise keep showing the transformed frame.
    settled = false;
    if (frame === undefined && typeof requestAnimationFrame === "function") {
      frame = requestAnimationFrame(() => {
        frame = undefined;
        if (!settled) repaint();
      });
    }
  };
  map.on("movestart", onMoveStart);
  map.on("moveend", onMoveEnd);
  return {
    /** Record a completed paint of the current view and drop any gesture transform. */
    painted() {
      settled = true;
      for (const canvas of elements()) {
        canvas.style.transform = "";
        if (!map.isMoving()) canvas.style.willChange = "";
      }
      painted = northUp(map) ? { zoom: map.getZoom(), anchor: map.project(VIEWPORT_ANCHOR) } : undefined;
    },
    /** Move the last painted frame with an active gesture; false asks for a real paint. */
    transform() {
      if (!painted || !map.isMoving() || !northUp(map)) return false;
      const scale = 2 ** (map.getZoom() - painted.zoom);
      const anchor = map.project(VIEWPORT_ANCHOR);
      const value = `translate(${anchor.x - painted.anchor.x * scale}px, ${anchor.y - painted.anchor.y * scale}px) scale(${scale})`;
      for (const canvas of elements()) {
        canvas.style.transformOrigin = "0 0";
        canvas.style.transform = value;
      }
      return true;
    },
    dispose() {
      map.off("movestart", onMoveStart);
      map.off("moveend", onMoveEnd);
      if (frame !== undefined && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
      frame = undefined;
      painted = undefined;
      for (const canvas of elements()) {
        canvas.style.transform = "";
        canvas.style.willChange = "";
      }
    },
  };
}
