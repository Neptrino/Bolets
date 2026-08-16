import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { hydrothermalV2ConfigFrom } from "@/data/model-priors";
import { getSpecies, getSpeciesV1ModelConfig } from "@/data/species";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot, PredictionCell } from "@/src/lib/types";
import {
  fetchOpenMeteoLocations,
  normalizeOpenMeteoAt,
  type OpenMeteoLocation,
} from "@/supabase/functions/_shared/open-meteo";
import {
  definedValues,
  finiteNumber,
  missingFieldsForModel,
  predictionCell,
  rawDiagnostics,
  staticValues,
} from "@/tests/helpers/finding-replay-scoring";
import {
  FINDING_EVALUATION_VERSION,
  sampleControlDates,
} from "@/tests/helpers/finding-evaluation";
import {
  HISTORICAL_ICON_EU_SOIL_MODEL,
  historicalRangeRequestUrl,
  parsePrivateEvaluationFindings,
  type PrivateHistoricalFinding,
} from "@/tests/helpers/historical-finding-replay";
import { comparisonAppUrl } from "@/tests/helpers/provider-shadow-report";

const inputPath = process.env.FINDING_EVAL_INPUT;
const artifactsDir = process.env.FINDING_EVAL_ARTIFACTS_DIR;

const MILLISECONDS_PER_DAY = 86_400_000;
/** Longest production window plus a day of slack, matching the manual tool. */
const LEAD_IN_DAYS = 38;
const MAX_SPAN_DAYS = 92;
const EVENT_OFFSETS = [-3, -2, -1, 0, 1, 2, 3] as const;
const REQUEST_SPACING_MS = 500;

type Target = {
  kind: "event" | "control" | "observed-negative";
  date: string;
  observedAt: string;
};

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function dayNumber(isoDate: string) {
  return Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / MILLISECONDS_PER_DAY);
}

function isoFromDayNumber(day: number) {
  return new Date(day * MILLISECONDS_PER_DAY).toISOString().slice(0, 10);
}

/**
 * Packs targets into as few provider requests as possible: each span covers a
 * run of targets whose lead-in still fits inside the provider's 92-day limit.
 */
export function planSpans(targetDates: string[]) {
  const days = [...new Set(targetDates)].map(dayNumber).sort((left, right) => left - right);
  const spans: { startDate: string; endDate: string }[] = [];
  let index = 0;
  while (index < days.length) {
    const start = days[index] - LEAD_IN_DAYS;
    let end = days[index];
    let next = index + 1;
    while (next < days.length && days[next] - start + 1 <= MAX_SPAN_DAYS) {
      end = days[next];
      next += 1;
    }
    spans.push({ startDate: isoFromDayNumber(start), endDate: isoFromDayNumber(end) });
    index = next;
  }
  return spans;
}

function cacheKey(url: URL) {
  return createHash("sha256").update(url.toString()).digest("hex");
}

const transfers = { cacheHits: 0, networkFetches: 0 };

async function fetchSeriesCached(url: URL, context: string, cacheDir: string) {
  const file = join(cacheDir, `${cacheKey(url)}.json`);
  if (existsSync(file)) {
    transfers.cacheHits += 1;
    return JSON.parse(readFileSync(file, "utf8")) as OpenMeteoLocation;
  }
  const [location] = await fetchOpenMeteoLocations(url, context);
  transfers.networkFetches += 1;
  writeFileSync(file, JSON.stringify(location), { mode: 0o600 });
  await wait(REQUEST_SPACING_MS);
  return location;
}

function applyV2Overrides(
  config: ReturnType<typeof hydrothermalV2ConfigFrom>,
  overrides: {
    water?: Record<string, number>;
    combination?: Record<string, number>;
    temperature?: Record<string, number>;
    phenology?: Record<string, number>;
  } | null,
) {
  if (!overrides || config.status !== "supported" || config.model !== "hydrothermal-v2") {
    return config;
  }
  // optimumShiftC is additive on the already-derived species optimum, so a
  // sweep can move every species uniformly; the remaining keys replace.
  const { optimumShiftC = 0, ...temperatureReplacements } = overrides.temperature ?? {};
  return {
    ...config,
    water: { ...config.water, ...(overrides.water ?? {}) },
    combination: { ...config.combination, ...(overrides.combination ?? {}) },
    temperature: {
      ...config.temperature,
      ...temperatureReplacements,
      optimumC: config.temperature.optimumC + optimumShiftC,
    },
    phenology: overrides.phenology && config.phenology.altitudeShift
      ? {
          ...config.phenology,
          altitudeShift: { ...config.phenology.altitudeShift, ...overrides.phenology },
        }
      : config.phenology,
  };
}

function spanCovers(span: { startDate: string; endDate: string }, date: string) {
  return date >= span.startDate && date <= span.endDate;
}

it.skipIf(!inputPath || !artifactsDir)(
  "replays findings and matched controls into private evaluation artifacts",
  async () => {
    const allowRemote = process.env.FINDING_EVAL_ALLOW_REMOTE === "1";
    const appUrl = comparisonAppUrl(process.env.FINDING_EVAL_APP_URL, allowRemote);
    const cacheDir = process.env.FINDING_EVAL_CACHE_DIR ?? join(artifactsDir!, "cache");
    const controlsPerEvent = Number(process.env.FINDING_EVAL_CONTROLS_PER_EVENT ?? 3);
    const seed = Number(process.env.FINDING_EVAL_SEED ?? 1);
    const soilShadow = process.env.FINDING_EVAL_SOIL_SHADOW === "1";
    const scoringModel = process.env.FINDING_EVAL_MODEL === "v2" ? "v2" : "v1";
    // Parameter sweeps patch the v2 config so candidate values can be fitted
    // against the same events without editing shipped priors.
    const v2Overrides = process.env.FINDING_EVAL_V2_OVERRIDES
      ? JSON.parse(process.env.FINDING_EVAL_V2_OVERRIDES) as {
          water?: Record<string, number>;
          combination?: Record<string, number>;
          temperature?: Record<string, number>;
          phenology?: Record<string, number>;
        }
      : null;
    mkdirSync(artifactsDir!, { recursive: true, mode: 0o700 });
    mkdirSync(cacheDir, { recursive: true, mode: 0o700 });

    const stats = statSync(inputPath!);
    const inputFiles = stats.isDirectory()
      ? readdirSync(inputPath!)
          .filter((name) => name.endsWith(".json") && !name.includes("metadata"))
          .map((name) => join(inputPath!, name))
      : [inputPath!];

    const findings: PrivateHistoricalFinding[] = [];
    const kindByIndex: ("event" | "observed-negative")[] = [];
    for (const file of inputFiles) {
      const parsed = parsePrivateEvaluationFindings(readFileSync(file, "utf8"));
      const kind = file.includes("observed-negative") ? "observed-negative" : "event";
      for (const finding of parsed) {
        findings.push(finding);
        kindByIndex.push(kind);
      }
    }
    if (findings.length === 0) throw new Error("No findings were supplied for evaluation");

    // Controls are drawn only for true positives; observed negatives are
    // already labelled background and need no synthetic partner.
    const positiveFindings = findings.filter((_, index) => kindByIndex[index] === "event");
    const controlsByPositive = sampleControlDates(positiveFindings, {
      controlsPerEvent,
      seed,
    });

    const artifactPath = join(artifactsDir!, "evaluation-records.jsonl");
    writeFileSync(artifactPath, "", { mode: 0o600 });
    let positiveIndex = 0;
    const failures: { location: number; reason: string }[] = [];

    for (const [index, finding] of findings.entries()) {
      const kind = kindByIndex[index];
      const location = index + 1;
      const targets: Target[] = [];
      if (kind === "event") {
        positiveIndex += 1;
        for (const offset of EVENT_OFFSETS) {
          const observedAt = new Date(
            Date.parse(finding.observedAt) + offset * MILLISECONDS_PER_DAY,
          ).toISOString();
          targets.push({
            kind: "event",
            date: observedAt.slice(0, 10),
            observedAt,
          });
        }
        for (const control of controlsByPositive.filter(
          (entry) => entry.location === positiveIndex,
        )) {
          targets.push({
            kind: "control",
            date: control.date,
            observedAt: new Date(control.observedAt).toISOString(),
          });
        }
      } else {
        targets.push({
          kind: "observed-negative",
          date: finding.observedAt.slice(0, 10),
          observedAt: finding.observedAt,
        });
      }

      try {
        const cells = await Promise.all(finding.speciesIds.map(async (speciesId) => ({
          speciesId,
          cell: await predictionCell(finding, speciesId, appUrl) as PredictionCell,
        })));
        const reference = cells[0].cell.values;
        const atmosphericLatitude = reference.weatherGridLatitude;
        const atmosphericLongitude = reference.weatherGridLongitude;
        const atmosphericElevation = reference.weatherElevationM;
        const soilLatitude = reference.soilGridLatitude;
        const soilLongitude = reference.soilGridLongitude;
        if (
          !finiteNumber(atmosphericLatitude) || !finiteNumber(atmosphericLongitude) ||
          !finiteNumber(atmosphericElevation) || !finiteNumber(soilLatitude) ||
          !finiteNumber(soilLongitude)
        ) {
          throw new Error("Canonical cell lacks provider-grid replay metadata");
        }

        const spans = planSpans(targets.map((target) => target.date));
        const atmosphereBySpan = new Map<number, OpenMeteoLocation>();
        const soilBySpan = new Map<number, OpenMeteoLocation>();
        const iconEuBySpan = new Map<number, OpenMeteoLocation>();
        for (const [spanIndex, span] of spans.entries()) {
          atmosphereBySpan.set(spanIndex, await fetchSeriesCached(
            historicalRangeRequestUrl({
              profile: "atmosphere",
              latitude: atmosphericLatitude,
              longitude: atmosphericLongitude,
              elevationM: atmosphericElevation,
              startDate: span.startDate,
              endDate: span.endDate,
            }),
            "evaluation AROME atmosphere",
            cacheDir,
          ));
          soilBySpan.set(spanIndex, await fetchSeriesCached(
            historicalRangeRequestUrl({
              profile: "soil",
              latitude: soilLatitude,
              longitude: soilLongitude,
              startDate: span.startDate,
              endDate: span.endDate,
            }),
            "evaluation best-match soil",
            cacheDir,
          ));
          if (soilShadow) {
            iconEuBySpan.set(spanIndex, await fetchSeriesCached(
              historicalRangeRequestUrl({
                profile: "soil",
                latitude: soilLatitude,
                longitude: soilLongitude,
                startDate: span.startDate,
                endDate: span.endDate,
                model: HISTORICAL_ICON_EU_SOIL_MODEL,
              }),
              "evaluation ICON-EU soil shadow",
              cacheDir,
            ));
          }
        }

        for (const target of targets) {
          const spanIndex = spans.findIndex((span) => spanCovers(span, target.date));
          if (spanIndex < 0) continue;
          const atmosphere = normalizeOpenMeteoAt(
            atmosphereBySpan.get(spanIndex)!,
            target.observedAt,
            "atmosphere",
          );
          const soil = normalizeOpenMeteoAt(
            soilBySpan.get(spanIndex)!,
            target.observedAt,
            "soil",
          );
          const iconEuSoil = soilShadow
            ? normalizeOpenMeteoAt(iconEuBySpan.get(spanIndex)!, target.observedAt, "soil")
            : null;

          for (const { speciesId, cell } of cells) {
            const shipped = getSpecies(speciesId)!;
            if (shipped.modelConfig.status !== "supported") continue;
            // Either model version can be requested regardless of which one
            // the shipped catalogue currently selects, so v1-vs-v2 shadow
            // comparisons keep working after the production cutover.
            const profile = scoringModel === "v1"
              ? shipped.modelConfig.model === "hydrothermal-v1"
                ? shipped
                : { ...shipped, modelConfig: getSpeciesV1ModelConfig(speciesId)! }
              : {
                  ...shipped,
                  modelConfig: applyV2Overrides(
                    shipped.modelConfig.model === "hydrothermal-v1"
                      ? hydrothermalV2ConfigFrom(shipped.modelConfig)
                      : shipped.modelConfig,
                    v2Overrides,
                  ),
                };
            const model = profile.modelConfig;
            if (model.status !== "supported") continue;
            const values: ConditionSnapshot["values"] = {
              ...staticValues(cell),
              ...definedValues(atmosphere.values),
              ...definedValues(soil.values),
              weatherModel: "Météo-France AROME France historical forecast",
              atmosphericResolutionM: 2500,
              soilMoistureResolutionM: 9000,
            };
            const unavailableFields = [
              ...new Set([
                ...atmosphere.unavailableFields,
                ...soil.unavailableFields,
                ...missingFieldsForModel(profile, values),
              ]),
            ];
            const result = calculateSuitability(profile, {
              regionId: cell.regionId,
              observedAt: target.observedAt,
              source: [
                "Météo-France AROME historical forecast via Open-Meteo",
                "Open-Meteo historical best-match soil moisture",
              ],
              confidence: "limited",
              stale: false,
              unavailableFields,
              values,
            });
            const raw = rawDiagnostics(profile, target.observedAt, values);

            let iconEuWater: number | null = null;
            let iconEuFruitingConditions: number | null = null;
            if (iconEuSoil) {
              const iconEuValues: ConditionSnapshot["values"] = {
                ...staticValues(cell),
                ...definedValues(atmosphere.values),
                ...definedValues(iconEuSoil.values),
                weatherModel: "AROME + ICON-EU historical soil shadow",
                atmosphericResolutionM: 2500,
                soilMoistureResolutionM: 7000,
              };
              const iconEuRaw = rawDiagnostics(profile, target.observedAt, iconEuValues);
              iconEuWater = iconEuRaw.water;
              iconEuFruitingConditions = iconEuRaw.fruitingConditions === null
                ? null
                : iconEuRaw.fruitingConditions * 100;
            }

            const windowMeanTemperatureC =
              model.temperature.windowDays === 14
                ? values.temperatureAvg14dC ?? null
                : values.temperatureAvg20dC ?? null;

            const record = {
              evaluationVersion: FINDING_EVALUATION_VERSION,
              location,
              speciesId,
              kind: target.kind,
              date: target.date,
              offsetDaysFromFinding: target.kind === "event"
                ? Math.round(
                    (Date.parse(target.observedAt) - Date.parse(finding.observedAt)) /
                      MILLISECONDS_PER_DAY,
                  )
                : null,
              opportunityIndex: result.opportunityIndex,
              fruitingConditionsScore: result.fruitingConditionsScore,
              raw,
              exponents: {
                waterExponent: model.water.waterExponent,
                triggerDependency: model.model === "hydrothermal-v2"
                  ? 0
                  : model.water.triggerDependency,
                vpdExponent: model.water.vpdExponent,
                drySpellExponent: model.water.drySpellExponent,
              },
              optimumC: model.temperature.optimumC,
              windowMeanTemperatureC,
              iconEuWater,
              iconEuFruitingConditions,
              unavailableFields,
              modelVersion: model.version,
              scoringModel,
            };

            const line = JSON.stringify(record);
            // Artifacts must never carry anything that could re-identify a spot.
            expect(line).not.toMatch(/latitude|longitude|cellId|weatherGrid|soilGrid/i);
            appendFileSync(artifactPath, `${line}\n`);
          }
        }
      } catch (error) {
        failures.push({
          location,
          reason: error instanceof Error ? error.message : "unknown replay failure",
        });
      }
    }

    const written = readFileSync(artifactPath, "utf8").split("\n").filter(Boolean).length;
    const summary = {
      evaluationVersion: FINDING_EVALUATION_VERSION,
      locations: findings.length,
      controlsPerEvent,
      seed,
      soilShadow,
      scoringModel,
      seriesFromNetwork: transfers.networkFetches,
      seriesFromCache: transfers.cacheHits,
      records: written,
      failures,
    };
    writeFileSync(
      join(artifactsDir!, "replay-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      { mode: 0o600 },
    );
    console.log(JSON.stringify(summary, null, 2));
    expect(written).toBeGreaterThan(0);
  },
  1_800_000,
);
