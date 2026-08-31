export type SuitabilityBand = {
  id: "very-bad" | "bad" | "regular" | "good" | "excellent";
  label: "Molt baixa" | "Baixa" | "Mitjana" | "Alta" | "Molt alta";
  description: string;
  minimum: number;
  color: string;
};

export const suitabilityScale: SuitabilityBand[] = [
  { id: "very-bad", label: "Molt baixa", description: "Condicions molt poc favorables.", minimum: 0, color: "#c95e35" },
  { id: "bad", label: "Baixa", description: "Condicions poc favorables.", minimum: 20, color: "#dd873c" },
  { id: "regular", label: "Mitjana", description: "Condicions intermèdies.", minimum: 40, color: "#c5a34a" },
  { id: "good", label: "Alta", description: "Condicions favorables.", minimum: 60, color: "#88a84f" },
  { id: "excellent", label: "Molt alta", description: "Condicions molt favorables.", minimum: 80, color: "#4f8a5b" }
];

const predictionMapColourStops = [
  ...suitabilityScale.map(({ minimum, color }, index) => ({
    score: index === 0 ? 1 : minimum,
    color,
  })),
  // Extend the highest band so scores from 80 to 100 remain distinguishable.
  { score: 100, color: "#2f704d" },
];

function rgbFromHex(color: string) {
  return {
    red: Number.parseInt(color.slice(1, 3), 16),
    green: Number.parseInt(color.slice(3, 5), 16),
    blue: Number.parseInt(color.slice(5, 7), 16),
  };
}

function interpolateChannel(start: number, end: number, progress: number) {
  return Math.round(start + (end - start) * progress);
}

export function getSuitabilityBand(score: number): SuitabilityBand {
  const boundedScore = Math.min(100, Math.max(0, score));
  for (let index = suitabilityScale.length - 1; index >= 0; index -= 1) {
    const band = suitabilityScale[index];
    if (boundedScore >= band.minimum) return band;
  }
  return suitabilityScale[0];
}

export function predictionMapCellColour(score: number | null) {
  if (score === null) return "rgba(150, 149, 142, 0.24)";
  // A verified zero is available evidence, but it must not look like a
  // positive low score. Keep the terrain visible and let the dashed outline
  // carry the zero state.
  if (score === 0) return "rgba(112, 103, 88, 0.1)";

  const boundedScore = Number.isFinite(score)
    ? Math.min(100, Math.max(1, score))
    : 1;
  const upperIndex = predictionMapColourStops.findIndex(({ score: stopScore }) =>
    stopScore >= boundedScore
  );
  const upper = predictionMapColourStops[upperIndex];
  const lower = predictionMapColourStops[Math.max(0, upperIndex - 1)];
  const progress = upper.score === lower.score
    ? 0
    : (boundedScore - lower.score) / (upper.score - lower.score);
  const lowerRgb = rgbFromHex(lower.color);
  const upperRgb = rgbFromHex(upper.color);
  const red = interpolateChannel(lowerRgb.red, upperRgb.red, progress);
  const green = interpolateChannel(lowerRgb.green, upperRgb.green, progress);
  const blue = interpolateChannel(lowerRgb.blue, upperRgb.blue, progress);
  return `rgba(${red}, ${green}, ${blue}, 0.68)`;
}

function colourChannels(color: string) {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ] as const;
}

/** Continuous colour interpolation for the optional editorial heat surface. */
export function predictionHeatmapColour(score: number | null) {
  if (score === null || score <= 0) return "rgba(0, 0, 0, 0)";
  const bounded = Math.min(100, score);
  const stops = [
    ...suitabilityScale.map((band, index) => ({
      color: band.color,
      score: index === 0 ? 1 : band.minimum,
    })),
    { color: suitabilityScale.at(-1)!.color, score: 100 },
  ];
  const upperIndex = stops.findIndex((stop) => stop.score >= bounded);
  const rightIndex = upperIndex === -1 ? stops.length - 1 : upperIndex;
  const leftIndex = Math.max(0, rightIndex - 1);
  const left = stops[leftIndex];
  const right = stops[rightIndex];
  const ratio = right.score === left.score
    ? 0
    : Math.max(0, Math.min(1, (bounded - left.score) / (right.score - left.score)));
  const leftChannels = colourChannels(left.color);
  const rightChannels = colourChannels(right.color);
  const channels = leftChannels.map((channel, index) =>
    Math.round(channel + (rightChannels[index] - channel) * ratio)
  );
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, 0.84)`;
}
