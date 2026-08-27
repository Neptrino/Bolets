const ALTITUDE_MARGIN_M = 100;

// The altitude suitability taper itself lives in SQL
// (public.habitat_altitude_weight), where the prediction path executes it.
// This module only derives the query envelope sent to that gate.
export function altitudeHabitatEnvelope(range: [number, number]): [number, number] {
  return [Math.max(0, range[0] - ALTITUDE_MARGIN_M), range[1] + ALTITUDE_MARGIN_M];
}
