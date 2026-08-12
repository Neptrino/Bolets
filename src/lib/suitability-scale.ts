export type SuitabilityBand = {
  id: "very-bad" | "bad" | "regular" | "good" | "excellent";
  label: "Molt dolent" | "Dolent" | "Regular" | "Bo" | "Excel·lent";
  description: string;
  minimum: number;
  color: string;
};

export const suitabilityScale: SuitabilityBand[] = [
  { id: "very-bad", label: "Molt dolent", description: "Molt lluny de les condicions ideals.", minimum: 0, color: "#c95e35" },
  { id: "bad", label: "Dolent", description: "Aquest factor limita força la idoneïtat.", minimum: 20, color: "#dd873c" },
  { id: "regular", label: "Regular", description: "Acceptable, però encara lluny de l’òptim.", minimum: 40, color: "#c5a34a" },
  { id: "good", label: "Bo", description: "Compatible amb la fructificació de l’espècie.", minimum: 60, color: "#88a84f" },
  { id: "excellent", label: "Excel·lent", description: "Molt proper a la finestra ideal de l’espècie.", minimum: 80, color: "#4f8a5b" }
];

export function getSuitabilityBand(score: number): SuitabilityBand {
  const boundedScore = Math.min(100, Math.max(0, score));
  for (let index = suitabilityScale.length - 1; index >= 0; index -= 1) {
    const band = suitabilityScale[index];
    if (boundedScore >= band.minimum) return band;
  }
  return suitabilityScale[0];
}

function hexadecimalColourChannels(color: string) {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
  ] as const;
}

export function predictionMapCellColour(
  score: number | null,
  habitatCoverage: number | null | undefined = null,
) {
  if (score === null) return "rgba(150, 149, 142, 0.24)";
  const target = hexadecimalColourChannels(getSuitabilityBand(score).color);
  const excluded = hexadecimalColourChannels(suitabilityScale[0].color);
  const coverage = habitatCoverage == null
    ? 1
    : Math.max(0, Math.min(1, habitatCoverage));
  const [red, green, blue] = target.map((channel, index) =>
    Math.round(excluded[index] + (channel - excluded[index]) * coverage)
  );
  return `rgba(${red}, ${green}, ${blue}, 0.68)`;
}
