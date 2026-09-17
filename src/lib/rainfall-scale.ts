/**
 * Accumulated-rainfall scale for the 7-day rain map.
 *
 * Rain is a magnitude, so the ramp is one hue from light to dark, with no
 * hue change at any step: a darker blue always means more water. The bands
 * are the ones a boletaire reads the sky with — a shower that wets the
 * litter, a rain that reaches the soil, a soaking week — not equal
 * arithmetic steps.
 */

export type RainfallBand = {
  id: "dry" | "trace" | "light" | "moderate" | "wet" | "very-wet" | "soaked";
  /** Lower bound in millimetres, inclusive. */
  minimumMm: number;
  label: string;
  colour: string;
};

/** Below this the ground is painted as dry and the terrain stays visible. */
export const RAINFALL_DRY_THRESHOLD_MM = 2;

/** The darkest step; more rain than this keeps the same colour. */
export const RAINFALL_CEILING_MM = 120;

export const rainfallScale: RainfallBand[] = [
  { id: "dry", minimumMm: 0, label: "Menys de 2 mm", colour: "#e4e2da" },
  { id: "trace", minimumMm: 2, label: "2–5 mm", colour: "#cadfec" },
  { id: "light", minimumMm: 5, label: "5–10 mm", colour: "#9ec9e2" },
  { id: "moderate", minimumMm: 10, label: "10–20 mm", colour: "#6aabd2" },
  { id: "wet", minimumMm: 20, label: "20–40 mm", colour: "#3d87bd" },
  { id: "very-wet", minimumMm: 40, label: "40–80 mm", colour: "#25649c" },
  { id: "soaked", minimumMm: 80, label: "80 mm o més", colour: "#173f6d" },
];

export function getRainfallBand(millimetres: number): RainfallBand {
  for (let index = rainfallScale.length - 1; index >= 0; index -= 1) {
    if (millimetres >= rainfallScale[index].minimumMm) return rainfallScale[index];
  }
  return rainfallScale[0];
}

function rgbFromHex(colour: string) {
  return {
    red: Number.parseInt(colour.slice(1, 3), 16),
    green: Number.parseInt(colour.slice(3, 5), 16),
    blue: Number.parseInt(colour.slice(5, 7), 16),
  };
}

/** Painted bands start above the dry threshold so dry ground stays unpainted. */
const paintedStops = rainfallScale.filter((band) => band.id !== "dry");

/**
 * A continuous colour for a smoothed field: the surface is interpolated
 * between band colours so the map reads as a rain field, while the legend
 * still names the steps the colours came from.
 */
export function rainfallColour(millimetres: number) {
  const bounded = Math.min(RAINFALL_CEILING_MM, Math.max(0, millimetres));
  const lightest = paintedStops[0];
  const darkest = paintedStops[paintedStops.length - 1];
  // Outside the interpolated range the ends hold: below the first step the
  // lightest colour, above the last one the darkest. Reaching for a stop
  // that is not there would paint the heaviest rain as the lightest.
  if (bounded <= lightest.minimumMm) return rgbFromHex(lightest.colour);
  if (bounded >= darkest.minimumMm) return rgbFromHex(darkest.colour);
  const upperIndex = paintedStops.findIndex((band) => band.minimumMm >= bounded);
  const lower = paintedStops[upperIndex - 1];
  const upper = paintedStops[upperIndex];
  const span = upper.minimumMm - lower.minimumMm;
  const progress = span <= 0 ? 0 : (bounded - lower.minimumMm) / span;
  const from = rgbFromHex(lower.colour);
  const to = rgbFromHex(upper.colour);
  return {
    red: Math.round(from.red + (to.red - from.red) * progress),
    green: Math.round(from.green + (to.green - from.green) * progress),
    blue: Math.round(from.blue + (to.blue - from.blue) * progress),
  };
}

const millimetreFormat = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 });

export function formatMillimetres(value: number | undefined) {
  return value === undefined ? "—" : `${millimetreFormat.format(Math.round(value * 10) / 10)} mm`;
}

export function formatDays(value: number | undefined) {
  if (value === undefined) return "—";
  const days = Math.round(value);
  return days === 1 ? "1 dia" : `${millimetreFormat.format(days)} dies`;
}
