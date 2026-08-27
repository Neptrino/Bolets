const difficultyLabels: Record<string, string> = {
  Baixa: "Senzilla",
  "Baixa a mitjana": "Senzilla",
  Mitjana: "Moderada",
  "Mitjana a alta": "Difícil",
  Alta: "Difícil",
  "Molt alta": "Molt difícil",
  "Cal contrastar diversos trets": "Difícil",
};

export function identificationDifficultyLabel(value: string) {
  return difficultyLabels[value] ?? value;
}
