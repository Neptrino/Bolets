export const ALTITUDE_MARGIN_M = 100;
export const ALTITUDE_EDGE_TAPER_M = 100;
export const ALTITUDE_BOUNDARY_SCORE = 75;

function roundScore(value: number) {
  return Math.round(value * 100) / 100;
}

export function altitudeSuitabilityScore(value: number, range: [number, number]) {
  const [min, max] = range;
  const lowerMargin = min - ALTITUDE_MARGIN_M;
  const upperMargin = max + ALTITUDE_MARGIN_M;

  if (value <= lowerMargin || value >= upperMargin) return 0;
  if (value < min) {
    return roundScore(ALTITUDE_BOUNDARY_SCORE * ((value - lowerMargin) / ALTITUDE_MARGIN_M));
  }
  if (value > max) {
    return roundScore(ALTITUDE_BOUNDARY_SCORE * ((upperMargin - value) / ALTITUDE_MARGIN_M));
  }

  const taperWidth = Math.min(ALTITUDE_EDGE_TAPER_M, Math.max((max - min) / 2, 0));
  if (taperWidth === 0) return ALTITUDE_BOUNDARY_SCORE;
  if (value < min + taperWidth) {
    return roundScore(
      ALTITUDE_BOUNDARY_SCORE +
        (100 - ALTITUDE_BOUNDARY_SCORE) * ((value - min) / taperWidth)
    );
  }
  if (value > max - taperWidth) {
    return roundScore(
      ALTITUDE_BOUNDARY_SCORE +
        (100 - ALTITUDE_BOUNDARY_SCORE) * ((max - value) / taperWidth)
    );
  }
  return 100;
}

export function altitudeHabitatEnvelope(range: [number, number]): [number, number] {
  return [Math.max(0, range[0] - ALTITUDE_MARGIN_M), range[1] + ALTITUDE_MARGIN_M];
}
