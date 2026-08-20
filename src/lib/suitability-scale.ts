export type SuitabilityBand = {
  id: "very-bad" | "bad" | "regular" | "good" | "excellent";
  label: "Molt baixa" | "Baixa" | "Mitjana" | "Alta" | "Molt alta";
  description: string;
  minimum: number;
  color: string;
};

export const suitabilityScale: SuitabilityBand[] = [
  { id: "very-bad", label: "Molt baixa", description: "Resposta molt baixa dins l’escala ordinal del model.", minimum: 0, color: "#c95e35" },
  { id: "bad", label: "Baixa", description: "Resposta baixa dins l’escala ordinal del model.", minimum: 20, color: "#dd873c" },
  { id: "regular", label: "Mitjana", description: "Resposta intermèdia dins l’escala ordinal del model.", minimum: 40, color: "#c5a34a" },
  { id: "good", label: "Alta", description: "Resposta alta dins l’escala ordinal del model.", minimum: 60, color: "#88a84f" },
  { id: "excellent", label: "Molt alta", description: "Resposta molt alta dins l’escala ordinal del model.", minimum: 80, color: "#4f8a5b" }
];

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
  const color = getSuitabilityBand(score).color;
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, 0.68)`;
}
