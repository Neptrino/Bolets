import "server-only";

import type {
  PredictionCellTimeline,
  PredictionForecastPoint,
  PredictionHistoryPoint,
} from "@/src/lib/types";

interface SimulationEnvironment {
  NODE_ENV?: string;
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function score(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function developmentForecastSimulation(
  timeline: PredictionCellTimeline,
  key: string,
  options: {
    environment?: SimulationEnvironment;
    generatedAt?: string;
  } = {},
) {
  const environment = options.environment ?? process.env;
  const anchor = [...timeline.observed]
    .reverse()
    .find((point): point is PredictionHistoryPoint & { score: number } =>
      point.score !== null
    );

  if (environment.NODE_ENV !== "development" || timeline.forecast || !anchor) {
    return { timeline, simulated: false } as const;
  }

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const generatedAtMilliseconds = Date.parse(generatedAt);
  const hash = stableHash(key);
  const direction = hash % 2 === 0 ? 1 : -1;
  const dailyDrift = 2 + ((hash >>> 3) % 4);
  const fruitingAnchor = anchor.fruitingConditionsScore ?? anchor.score;
  const points = ([1, 2, 3, 4, 5] as const).map((horizonDays) => {
    const pulse = ((hash >>> (horizonDays * 3)) % 5) - 2;
    const change = direction * dailyDrift * horizonDays + pulse;
    const opportunityIndex = score(anchor.score + change);
    return {
      validAt: new Date(
        generatedAtMilliseconds + horizonDays * 86_400_000,
      ).toISOString(),
      score: opportunityIndex,
      fruitingConditionsScore: score(fruitingAnchor + change),
      opportunityIndex,
      horizonDays,
      horizonConfidence: "limited",
    } satisfies PredictionForecastPoint;
  });

  return {
    simulated: true,
    timeline: {
      ...timeline,
      forecast: {
        generatedAt,
        source: ["Simulació local · dades fictícies"],
        sourceResolutionM: 0,
        anchor,
        calibratedAt: anchor.observedAt,
        correctionMethod: "development-simulation-v1",
        simulated: true,
        points,
      },
    } satisfies PredictionCellTimeline,
  } as const;
}

export function developmentTimelineSimulation(
  current: PredictionHistoryPoint & { score: number },
  modelVersion: string,
  key: string,
  options: {
    environment?: SimulationEnvironment;
    generatedAt?: string;
  } = {},
) {
  const environment = options.environment ?? process.env;
  if (environment.NODE_ENV !== "development") return null;

  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const generatedAtMilliseconds = Date.parse(generatedAt);
  const hash = stableHash(key);
  const direction = hash % 2 === 0 ? 1 : -1;
  const dailyDrift = 1 + ((hash >>> 5) % 3);
  const fruitingAnchor = current.fruitingConditionsScore ?? current.score;
  const observed = Array.from({ length: 7 }, (_, index) => {
    const daysAgo = 6 - index;
    if (daysAgo === 0) {
      return { ...current, observedAt: generatedAt };
    }
    const pulse = ((hash >>> (index * 3)) % 5) - 2;
    const historicalChange = -direction * dailyDrift * daysAgo + pulse;
    const opportunityIndex = score(current.score + historicalChange);
    return {
      observedAt: new Date(
        generatedAtMilliseconds - daysAgo * 86_400_000,
      ).toISOString(),
      score: opportunityIndex,
      fruitingConditionsScore: score(fruitingAnchor + historicalChange),
      opportunityIndex,
    } satisfies PredictionHistoryPoint;
  });

  return developmentForecastSimulation(
    {
      modelVersion,
      simulated: true,
      observed,
      forecast: null,
    },
    key,
    { environment, generatedAt },
  );
}
