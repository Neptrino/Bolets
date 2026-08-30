export const cataloniaMapBounds: [[number, number], [number, number]] = [
  [0.05, 40.48],
  [3.32, 42.92],
];

/**
 * MapLibre will not zoom out beyond the point where the whole viewport fits
 * inside `maxBounds`. Keep this envelope comfortably wider and taller than
 * Catalunya so landscape and portrait map frames can both use fitBounds
 * without clipping the country.
 */
export const regionMapPanBounds: [[number, number], [number, number]] = [
  [-1.25, 38.75],
  [4.65, 44.75],
];
