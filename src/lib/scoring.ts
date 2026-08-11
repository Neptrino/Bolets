import type { ConditionSnapshot, FactorContribution, SpeciesProfile, SuitabilityResult } from "@/src/lib/types";

function rangeScore(value: number | undefined, range: [number, number]) {
  if (value === undefined) return null;
  const [min, max] = range;
  if (value >= min && value <= max) return 100;
  const span = Math.max(max - min, 1);
  const distance = value < min ? min - value : value - max;
  return Math.max(0, Math.round(100 - (distance / span) * 100));
}

function altitudeScore(value: number | undefined, range: [number, number]) {
  if (value === undefined) return null;
  const [min, max] = range;
  return value >= min && value <= max ? 100 : 0;
}

function moistureScore(value: number | undefined, preference: string) {
  if (value === undefined) return null;
  const target = preference.toLowerCase().includes("alta") ? 0.32 : preference.toLowerCase().includes("baixa") ? 0.16 : 0.24;
  return Math.max(0, Math.round(100 - (Math.abs(value - target) / 0.2) * 100));
}

function rainfallScore(value: number | undefined) {
  if (value === undefined) return null;
  if (value >= 12 && value <= 45) return 100;
  return Math.max(0, Math.round(100 - Math.abs(value - 25) * 3));
}

function humidityScore(value: number | undefined) {
  if (value === undefined) return null;
  if (value >= 65 && value <= 90) return 100;
  return Math.max(0, Math.round(100 - Math.abs(value - 75) * 2));
}

function temperatureScore(species: SpeciesProfile, values: ConditionSnapshot["values"]) {
  const representativeTemperature = values.temperatureAvg24hC ?? values.temperatureC;
  const baseScore = rangeScore(representativeTemperature, species.ecologicalConfig.climate.temperatureRange);
  if (baseScore === null) return null;

  let score = baseScore;
  const recentMinimum = values.temperatureMin7dC ?? values.temperatureMin24hC;
  const toleratedFrost = normaliseTerm(species.ecologicalConfig.climate.frost).includes("tolera");
  if (recentMinimum !== undefined && recentMinimum <= 0) score = Math.min(score, toleratedFrost ? 35 : 10);
  else if (values.temperatureMin24hC !== undefined && values.temperatureMin24hC < 2) score = Math.min(score, 40);

  const idealMaximum = species.ecologicalConfig.climate.temperatureRange[1];
  if (values.temperatureMax24hC !== undefined && values.temperatureMax24hC >= idealMaximum + 6) score = Math.min(score, 25);
  else if (values.temperatureMax24hC !== undefined && values.temperatureMax24hC >= idealMaximum + 3) score = Math.min(score, 50);
  return score;
}

const monthIds = ["gen", "feb", "mar", "abr", "mai", "jun", "jul", "ago", "set", "oct", "nov", "des"] as const;

function seasonalityScore(species: SpeciesProfile, observedAt: string) {
  const date = new Date(observedAt);
  if (Number.isNaN(date.getTime())) return null;
  const activity = species.ecologicalConfig.seasonality[monthIds[date.getUTCMonth()]];
  return { inactive: 0, possible: 35, moderate: 65, good: 85, peak: 100 }[activity];
}

function normaliseTerm(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function textCompatibility(observed: string[], preferred: string[]) {
  if (!observed.length) return null;
  const targets = preferred.map(normaliseTerm).filter(Boolean);
  const matches = observed.map(normaliseTerm).filter(Boolean).filter((candidate) =>
    targets.some((target) => candidate === target || candidate.includes(target) || target.includes(candidate))
  ).length;
  if (!targets.length) return null;
  if (matches > 1) return 100;
  if (matches === 1) return 80;
  return 20;
}

function forestScore(species: SpeciesProfile, values: ConditionSnapshot["values"]) {
  if (values.forestCompatibility !== undefined) return values.forestCompatibility;
  return textCompatibility(
    [...(values.forestTypes ?? []), ...(values.treeSpecies ?? [])],
    [
      ...species.ecologicalConfig.habitat.forestTypes,
      ...species.ecologicalConfig.habitat.treeAssociations,
      ...species.ecologicalConfig.habitat.hosts
    ]
  );
}

function soilScore(species: SpeciesProfile, values: ConditionSnapshot["values"]) {
  if (values.soilCompatibility !== undefined) return values.soilCompatibility;
  const scores: number[] = [];
  if (values.soilPh !== undefined && species.ecologicalConfig.soil.phRange) {
    scores.push(rangeScore(values.soilPh, species.ecologicalConfig.soil.phRange) ?? 0);
  }
  const textScore = textCompatibility(
    [values.soilTexture, values.soilSubstrate].filter((value): value is string => Boolean(value)),
    [species.ecologicalConfig.soil.texture, species.ecologicalConfig.soil.substrate, species.ecologicalConfig.soil.reaction]
  );
  if (textScore !== null) scores.push(textScore);
  return scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : null;
}

export function calculateSuitability(species: SpeciesProfile, snapshot: ConditionSnapshot): SuitabilityResult {
  const { values } = snapshot;
  const factorScore = (id: FactorContribution["id"]): number | null => {
    switch (id) {
      case "forest": return forestScore(species, values);
      case "soil": return soilScore(species, values);
      case "rainfall": return rainfallScore(values.rainfall7dMm);
      case "soilMoisture": return moistureScore(values.soilMoistureAvg24h ?? values.soilMoisture, species.ecologicalConfig.climate.soilMoisture);
      case "temperature": return temperatureScore(species, values);
      case "altitude": return altitudeScore(values.altitudeM, species.ecologicalConfig.habitat.altitude);
      case "humidity": return humidityScore(values.relativeHumidityAvg24h ?? values.relativeHumidity);
      case "seasonality": return seasonalityScore(species, snapshot.observedAt);
    }
  };

  const contributions = species.modelConfig.factors.map((factor) => {
    const score = factorScore(factor.id);
    return {
      id: factor.id,
      label: factor.label,
      weight: factor.weight,
      score,
      state: score === null ? "unknown" : score >= 70 ? "favourable" : score >= 45 ? "mixed" : "unfavourable"
    } satisfies FactorContribution;
  });
  const known = contributions.filter((factor) => factor.score !== null);
  const totalWeight = contributions.reduce((total, factor) => total + factor.weight, 0);
  const knownWeight = known.reduce((total, factor) => total + factor.weight, 0);
  const dataCompleteness = totalWeight ? knownWeight / totalWeight : 0;
  const missingFactors = contributions.filter((factor) => factor.score === null).map((factor) => factor.id);
  const coreHabitatMissing = (["forest", "soil"] as const).some((id) =>
    contributions.some((factor) => factor.id === id && factor.score === null)
  );
  const dynamicKnown = (["rainfall", "soilMoisture", "temperature"] as const).filter((id) =>
    contributions.some((factor) => factor.id === id && factor.score !== null)
  ).length;
  if (!known.length || snapshot.stale || coreHabitatMissing || dynamicKnown < 2 || dataCompleteness < 0.7) {
    return { score: null, label: "sense dades", contributions, modelVersion: species.modelConfig.version, dataCompleteness, missingFactors };
  }
  const weight = known.reduce((total, factor) => total + factor.weight, 0);
  let score = Math.round(known.reduce((total, factor) => total + (factor.score ?? 0) * factor.weight, 0) / weight);
  const altitudeOutsideKnownRange = contributions.some((factor) => factor.id === "altitude" && factor.score === 0);
  if (altitudeOutsideKnownRange) score = 0;
  const currentStress = contributions.filter((factor) => ["temperature", "soilMoisture", "humidity"].includes(factor.id) && factor.score !== null && factor.score < 45).length;
  if (currentStress >= 2) score = Math.min(score, 35);
  else if (currentStress === 1) score = Math.min(score, 55);
  const frostHours = values.frostHours7d ?? (values.temperatureMin7dC !== undefined && values.temperatureMin7dC <= 0 ? 1 : 0);
  if (frostHours > 0) {
    const toleratedFrost = normaliseTerm(species.ecologicalConfig.climate.frost).includes("tolera");
    score = Math.min(score, toleratedFrost ? 55 : 20);
  }
  const seasonScore = contributions.find((factor) => factor.id === "seasonality")?.score;
  if (seasonScore === 0) score = Math.min(score, 20);
  else if (seasonScore !== null && seasonScore !== undefined && seasonScore <= 35) score = Math.min(score, 55);
  const label = score >= 80 ? "molt favorable" : score >= 65 ? "favorable" : score >= 45 ? "mixta" : "poc favorable";
  return { score, label, contributions, modelVersion: species.modelConfig.version, dataCompleteness, missingFactors };
}
