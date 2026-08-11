export type SuitabilityBand = {
  id: "very-bad" | "bad" | "regular" | "good" | "excellent";
  label: "Molt dolent" | "Dolent" | "Regular" | "Bo" | "Excel·lent";
  description: string;
  minimum: number;
  color: string;
};

export const suitabilityScale: SuitabilityBand[] = [
  { id: "very-bad", label: "Molt dolent", description: "Molt lluny de les condicions ideals.", minimum: 0, color: "#77746f" },
  { id: "bad", label: "Dolent", description: "Aquest factor limita força la idoneïtat.", minimum: 20, color: "#aa6a52" },
  { id: "regular", label: "Regular", description: "Acceptable, però encara lluny de l’òptim.", minimum: 40, color: "#d1955f" },
  { id: "good", label: "Bo", description: "Compatible amb la fructificació de l’espècie.", minimum: 60, color: "#f2a766" },
  { id: "excellent", label: "Excel·lent", description: "Molt proper a la finestra ideal de l’espècie.", minimum: 80, color: "#f28a2e" }
];

export function getSuitabilityBand(score: number): SuitabilityBand {
  const boundedScore = Math.min(100, Math.max(0, score));
  for (let index = suitabilityScale.length - 1; index >= 0; index -= 1) {
    const band = suitabilityScale[index];
    if (boundedScore >= band.minimum) return band;
  }
  return suitabilityScale[0];
}
