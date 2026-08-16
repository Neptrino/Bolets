import { expect, it } from "vitest";
import { getSpecies } from "@/data/species";
import { TERRAIN_THERMAL_SENSITIVITY_VERSION } from "@/src/lib/model-versions";
import { calculateSuitability } from "@/src/lib/scoring";
import type { ConditionSnapshot } from "@/src/lib/types";
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
  comparisonAppUrl,
} from "@/tests/helpers/provider-shadow-report";
import {
  gridDisplacementMetres,
  HISTORICAL_AROME_MODEL,
  HISTORICAL_FINDING_REPLAY_VERSION,
  HISTORICAL_ICON_EU_SOIL_MODEL,
  HISTORICAL_ICON_GLOBAL_SOIL_MODEL,
  HISTORICAL_SOIL_MODEL,
  historicalForecastRequestUrl,
  parsePrivateHistoricalFindings,
} from "@/tests/helpers/historical-finding-replay";

const encodedFindings = process.env.HISTORICAL_FINDINGS_COMPARE;
const TRAJECTORY_DAY_OFFSETS = [-7, 0, 7, 14] as const;
const MILLISECONDS_PER_DAY = 86_400_000;
const TERRAIN_THERMAL_FIELDS = [
  "temperatureAvg14dC",
  "temperatureAvg20dC",
  "frostHours14d",
  "frostHours20d",
  "heatHours14d",
  "heatHours20d",
] as const;

function requireProviderPoint(
  location: OpenMeteoLocation,
  expectedLatitude: number,
  expectedLongitude: number,
) {
  if (!finiteNumber(location.latitude) || !finiteNumber(location.longitude)) {
    throw new Error("Historical provider omitted its returned grid point");
  }
  return Math.round(gridDisplacementMetres(
    expectedLatitude,
    expectedLongitude,
    location.latitude,
    location.longitude,
  ));
}

function identicalSoilSeries(left: OpenMeteoLocation, right: OpenMeteoLocation) {
  const leftTimes = left.hourly?.time;
  const rightTimes = right.hourly?.time;
  const leftValues = left.hourly?.soil_moisture_3_to_9cm;
  const rightValues = right.hourly?.soil_moisture_3_to_9cm;
  if (
    !Array.isArray(leftTimes) ||
    !Array.isArray(rightTimes) ||
    !Array.isArray(leftValues) ||
    !Array.isArray(rightValues) ||
    leftTimes.length !== rightTimes.length ||
    leftValues.length !== rightValues.length
  ) return false;
  return leftTimes.every((value, index) => value === rightTimes[index]) &&
    leftValues.every((value, index) => value === rightValues[index]);
}

function targetAtOffset(observedAt: string, offsetDays: number) {
  return new Date(Date.parse(observedAt) + offsetDays * MILLISECONDS_PER_DAY).toISOString();
}

function selectedEnvironmentFields(values: ConditionSnapshot["values"]) {
  return {
    temperatureAvg7dC: values.temperatureAvg7dC,
    temperatureAvg14dC: values.temperatureAvg14dC,
    temperatureAvg20dC: values.temperatureAvg20dC,
    frostHours20d: values.frostHours20d,
    heatHours20d: values.heatHours20d,
    relativeHumidityAvg7d: values.relativeHumidityAvg7d,
    rainfall7dMm: values.rainfall7dMm,
    rainfall14dMm: values.rainfall14dMm,
    rainfall21dMm: values.rainfall21dMm,
    rainfall26dMm: values.rainfall26dMm,
    rainfall30dMm: values.rainfall30dMm,
    rainfallDays26d: values.rainfallDays26d,
    evapotranspiration26dMm: values.evapotranspiration26dMm,
    drySpellDays: values.drySpellDays,
    soilMoistureAvg7d: values.soilMoistureAvg7d,
    soilMoistureMin7d: values.soilMoistureMin7d,
  };
}

function compactResult(result: ReturnType<typeof calculateSuitability>) {
  return {
    opportunityIndex: result.opportunityIndex,
    fruitingConditionsScore: result.fruitingConditionsScore,
    components: Object.fromEntries(
      result.components.map((component) => [component.id, component.score]),
    ),
  };
}

function terrainThermalValues(
  baseline: ConditionSnapshot["values"],
  local: ConditionSnapshot["values"],
) {
  const values = { ...baseline };
  for (const field of TERRAIN_THERMAL_FIELDS) {
    const value = local[field];
    if (value !== undefined) Object.assign(values, { [field]: value });
  }
  return values;
}

it.skipIf(!encodedFindings)(
  "replays dated private findings through archived AROME and soil windows without reporting coordinates",
  async () => {
    const findings = parsePrivateHistoricalFindings(encodedFindings!);
    const allowRemote = process.env.HISTORICAL_FINDINGS_ALLOW_REMOTE === "1" ||
      process.env.HISTORICAL_FINDINGS_ALLOW_REMOTE === "true";
    const appUrl = comparisonAppUrl(
      process.env.HISTORICAL_FINDINGS_APP_URL,
      allowRemote,
    );

    const locations = await Promise.all(findings.map(async (finding, index) => {
      const cells = await Promise.all(finding.speciesIds.map(async (speciesId) => ({
        speciesId,
        cell: await predictionCell(finding, speciesId, appUrl),
      })));
      const canonicalCellId = cells[0].cell.cellId;
      if (cells.some(({ cell }) => cell.cellId !== canonicalCellId)) {
        throw new Error("Species replays did not resolve to one canonical 250 m cell");
      }
      const reference = cells[0].cell.values;
      const atmosphericLatitude = reference.weatherGridLatitude;
      const atmosphericLongitude = reference.weatherGridLongitude;
      const atmosphericElevation = reference.weatherElevationM;
      const soilLatitude = reference.soilGridLatitude;
      const soilLongitude = reference.soilGridLongitude;
      const localElevation = reference.altitudeM;
      if (
        !finiteNumber(atmosphericLatitude) ||
        !finiteNumber(atmosphericLongitude) ||
        !finiteNumber(atmosphericElevation) ||
        !finiteNumber(soilLatitude) ||
        !finiteNumber(soilLongitude) ||
        !finiteNumber(localElevation)
      ) {
        throw new Error("Canonical cell lacks provider-grid replay metadata");
      }
      for (const { cell } of cells.slice(1)) {
        const values = cell.values;
        if (
          values.weatherGridLatitude !== atmosphericLatitude ||
          values.weatherGridLongitude !== atmosphericLongitude ||
          values.weatherElevationM !== atmosphericElevation ||
          values.soilGridLatitude !== soilLatitude ||
          values.soilGridLongitude !== soilLongitude
        ) {
          throw new Error("Species-specific cells disagree on provider-grid metadata");
        }
      }

      const [atmosphere] = await fetchOpenMeteoLocations(
        historicalForecastRequestUrl({
          profile: "atmosphere",
          latitude: atmosphericLatitude,
          longitude: atmosphericLongitude,
          elevationM: atmosphericElevation,
          targetAt: finding.observedAt,
          beforeDays: 38,
          afterDays: 14,
        }),
        "historical AROME finding replay",
      );
      const [localTerrainAtmosphere] = await fetchOpenMeteoLocations(
        historicalForecastRequestUrl({
          profile: "atmosphere",
          latitude: atmosphericLatitude,
          longitude: atmosphericLongitude,
          elevationM: localElevation,
          targetAt: finding.observedAt,
          beforeDays: 38,
          afterDays: 14,
          // Supplying a different statistical elevation can otherwise make
          // Open-Meteo's default land-cell selection jump horizontally. The
          // shadow is valid only when it retains the selected nearest AROME
          // grid point and changes elevation alone.
          cellSelection: "nearest",
        }),
        "historical local-terrain AROME finding replay",
      );
      const [soil] = await fetchOpenMeteoLocations(
        historicalForecastRequestUrl({
          profile: "soil",
          latitude: soilLatitude,
          longitude: soilLongitude,
          targetAt: finding.observedAt,
          beforeDays: 38,
          afterDays: 14,
        }),
        "historical best-match soil finding replay",
      );
      const [iconEuSoil] = await fetchOpenMeteoLocations(
        historicalForecastRequestUrl({
          profile: "soil",
          latitude: soilLatitude,
          longitude: soilLongitude,
          targetAt: finding.observedAt,
          beforeDays: 38,
          afterDays: 14,
          model: HISTORICAL_ICON_EU_SOIL_MODEL,
        }),
        "historical ICON-EU soil finding shadow",
      );
      const [iconGlobalSoil] = await fetchOpenMeteoLocations(
        historicalForecastRequestUrl({
          profile: "soil",
          latitude: soilLatitude,
          longitude: soilLongitude,
          targetAt: finding.observedAt,
          beforeDays: 38,
          afterDays: 14,
          model: HISTORICAL_ICON_GLOBAL_SOIL_MODEL,
        }),
        "historical ICON Global soil fingerprint",
      );
      const atmosphericGridDisplacementM = requireProviderPoint(
        atmosphere,
        atmosphericLatitude,
        atmosphericLongitude,
      );
      const soilGridDisplacementM = requireProviderPoint(
        soil,
        soilLatitude,
        soilLongitude,
      );
      const iconEuSoilGridDisplacementM = requireProviderPoint(
        iconEuSoil,
        soilLatitude,
        soilLongitude,
      );
      const iconGlobalSoilGridDisplacementM = requireProviderPoint(
        iconGlobalSoil,
        soilLatitude,
        soilLongitude,
      );
      const bestMatchFingerprintsIconGlobal = identicalSoilSeries(
        soil,
        iconGlobalSoil,
      );
      const terrainGridDisplacementM = requireProviderPoint(
        localTerrainAtmosphere,
        atmosphericLatitude,
        atmosphericLongitude,
      );
      const terrainVsBaselineGridDisplacementM = Math.round(gridDisplacementMetres(
        atmosphere.latitude!,
        atmosphere.longitude!,
        localTerrainAtmosphere.latitude!,
        localTerrainAtmosphere.longitude!,
      ));

      const normalizedByOffset = new Map(TRAJECTORY_DAY_OFFSETS.map((offsetDays) => {
        const targetAt = targetAtOffset(finding.observedAt, offsetDays);
        const normalizedAtmosphere = normalizeOpenMeteoAt(atmosphere, targetAt, "atmosphere");
        const normalizedLocalAtmosphere = normalizeOpenMeteoAt(
          localTerrainAtmosphere,
          targetAt,
          "atmosphere",
        );
        const normalizedSoil = normalizeOpenMeteoAt(soil, targetAt, "soil");
        const normalizedIconEuSoil = normalizeOpenMeteoAt(
          iconEuSoil,
          targetAt,
          "soil",
        );
        return [offsetDays, {
          targetAt,
          atmosphere: normalizedAtmosphere,
          localAtmosphere: normalizedLocalAtmosphere,
          soil: normalizedSoil,
          iconEuSoil: normalizedIconEuSoil,
          values: {
            ...definedValues(normalizedAtmosphere.values),
            ...definedValues(normalizedSoil.values),
            weatherModel: "Météo-France AROME France historical forecast",
            atmosphericResolutionM: 2500,
            soilMoistureResolutionM: 9000,
          } satisfies ConditionSnapshot["values"],
          iconEuValues: {
            ...definedValues(normalizedAtmosphere.values),
            ...definedValues(normalizedIconEuSoil.values),
            weatherModel: "Météo-France AROME + ICON-EU historical soil shadow",
            atmosphericResolutionM: 2500,
            soilMoistureResolutionM: 7000,
          } satisfies ConditionSnapshot["values"],
        }] as const;
      }));
      const findingDay = normalizedByOffset.get(0)!;

      const species = cells.map(({ speciesId, cell }) => {
        const profile = getSpecies(speciesId)!;
        const trajectory = TRAJECTORY_DAY_OFFSETS.map((offsetDays) => {
          const normalized = normalizedByOffset.get(offsetDays)!;
          const baselineValues = { ...staticValues(cell), ...normalized.values };
          const baselineUnavailableFields = [
            ...new Set([
              ...normalized.atmosphere.unavailableFields,
              ...normalized.soil.unavailableFields,
              ...missingFieldsForModel(profile, baselineValues),
            ]),
          ];
          const baselineResult = calculateSuitability(profile, {
            regionId: cell.regionId,
            observedAt: normalized.targetAt,
            source: [
              "Météo-France AROME historical forecast via Open-Meteo",
              "Open-Meteo historical best-match soil moisture",
            ],
            confidence: "limited",
            stale: false,
            unavailableFields: baselineUnavailableFields,
            values: baselineValues,
          });
          const terrainValues = terrainThermalValues(
            baselineValues,
            normalized.localAtmosphere.values,
          );
          const missingTerrainThermalFields = TERRAIN_THERMAL_FIELDS.filter(
            (field) => normalized.localAtmosphere.values[field] === undefined,
          );
          const terrainUnavailableFields = [
            ...new Set([...baselineUnavailableFields, ...missingTerrainThermalFields]),
          ];
          const terrainResult = calculateSuitability(profile, {
            regionId: cell.regionId,
            observedAt: normalized.targetAt,
            source: [
              "Météo-France AROME historical local-terrain shadow via Open-Meteo",
              "Open-Meteo historical best-match soil moisture",
            ],
            confidence: "limited",
            stale: false,
            unavailableFields: terrainUnavailableFields,
            values: terrainValues,
          });
          const iconEuValues = { ...staticValues(cell), ...normalized.iconEuValues };
          const iconEuUnavailableFields = [
            ...new Set([
              ...normalized.atmosphere.unavailableFields,
              ...normalized.iconEuSoil.unavailableFields,
              ...missingFieldsForModel(profile, iconEuValues),
            ]),
          ];
          const iconEuResult = calculateSuitability(profile, {
            regionId: cell.regionId,
            observedAt: normalized.targetAt,
            source: [
              "Météo-France AROME historical forecast via Open-Meteo",
              "DWD ICON-EU historical soil-moisture shadow via Open-Meteo",
            ],
            confidence: "limited",
            stale: false,
            unavailableFields: iconEuUnavailableFields,
            values: iconEuValues,
          });
          return {
            offsetDays,
            date: normalized.targetAt.slice(0, 10),
            productionElevationReplay: compactResult(baselineResult),
            localTerrainThermalShadow: compactResult(terrainResult),
            iconEuSoilShadow: compactResult(iconEuResult),
            rawProductionElevationReplay: rawDiagnostics(
              profile,
              normalized.targetAt,
              baselineValues,
            ),
            rawLocalTerrainThermalShadow: rawDiagnostics(
              profile,
              normalized.targetAt,
              terrainValues,
            ),
            rawIconEuSoilShadow: rawDiagnostics(
              profile,
              normalized.targetAt,
              iconEuValues,
            ),
            unavailableFields: [
              ...new Set([...terrainUnavailableFields, ...iconEuUnavailableFields]),
            ],
          };
        });
        return {
          speciesId,
          commonName: profile.identity.commonName,
          modelVersion: profile.modelConfig.version,
          staticHabitat: {
            habitatCoveragePercent: cell.values.habitatCoveragePercent,
            habitatAltitudeSuitability: cell.values.habitatAltitudeSuitability,
          },
          trajectory,
        };
      });

      return {
        location: index + 1,
        findingDate: finding.observedAt.slice(0, 10),
        targetTimeBasis: "explicit timestamp from private input",
        providerContract: {
          atmosphere: {
            model: HISTORICAL_AROME_MODEL,
            modelFamilyMatchesProduction: true,
            stitchedOperationalModelRetrospective: true,
            sourceResolutionM: 2500,
            providerGridDisplacementM: atmosphericGridDisplacementM,
            completeAtFinding: findingDay.atmosphere.unavailableFields.length === 0,
            unavailableFields: findingDay.atmosphere.unavailableFields,
          },
          terrainThermalShadow: {
            methodVersion: TERRAIN_THERMAL_SENSITIVITY_VERSION,
            sameModelAndGrid: terrainVsBaselineGridDisplacementM <= 1,
            providerGridDisplacementM: terrainGridDisplacementM,
            terrainVsBaselineGridDisplacementM,
            elevationDeltaM: Math.round(localElevation - atmosphericElevation),
            waterFieldsRemainProductionElevation: true,
            completeAtFinding: findingDay.localAtmosphere.unavailableFields.length === 0,
            unavailableFields: findingDay.localAtmosphere.unavailableFields,
          },
          soil: {
            model: HISTORICAL_SOIL_MODEL,
            contractCompatibleWithProduction: true,
            exactExplicitModelReplay: false,
            declaredProductionResolutionM: reference.soilMoistureResolutionM ?? 9000,
            nativeResolutionVerifiedByHistoricalResponse: false,
            providerGridDisplacementM: soilGridDisplacementM,
            explicitModelFingerprint: bestMatchFingerprintsIconGlobal
              ? HISTORICAL_ICON_GLOBAL_SOIL_MODEL
              : null,
            explicitModelFingerprintGridDisplacementM:
              iconGlobalSoilGridDisplacementM,
            fingerprintSourceResolutionM: bestMatchFingerprintsIconGlobal
              ? 11_000
              : null,
            declaredVsFingerprintResolutionMismatch:
              bestMatchFingerprintsIconGlobal &&
              (reference.soilMoistureResolutionM ?? 9000) !== 11_000,
            completeAtFinding: findingDay.soil.unavailableFields.length === 0,
            unavailableFields: findingDay.soil.unavailableFields,
          },
          iconEuSoilShadow: {
            model: HISTORICAL_ICON_EU_SOIL_MODEL,
            alternativeSingleWaterSource: true,
            productionInput: false,
            sourceResolutionM: 7000,
            nativeResolutionFromProviderDocumentation: true,
            providerGridDisplacementM: iconEuSoilGridDisplacementM,
            completeAtFinding: findingDay.iconEuSoil.unavailableFields.length === 0,
            unavailableFields: findingDay.iconEuSoil.unavailableFields,
          },
        },
        findingDayEnvironment: selectedEnvironmentFields(findingDay.values),
        environmentTrajectory: TRAJECTORY_DAY_OFFSETS.map((offsetDays) => {
          const normalized = normalizedByOffset.get(offsetDays)!;
          const values = normalized.values;
          return {
            offsetDays,
            temperatureAvg7dC: values.temperatureAvg7dC,
            relativeHumidityAvg7d: values.relativeHumidityAvg7d,
            rainfall26dMm: values.rainfall26dMm,
            rainfallDays26d: values.rainfallDays26d,
            evapotranspiration26dMm: values.evapotranspiration26dMm,
            drySpellDays: values.drySpellDays,
            soilMoistureAvg7d: values.soilMoistureAvg7d,
            soilMoistureMin7d: values.soilMoistureMin7d,
            iconEuSoilMoistureAvg7d:
              normalized.iconEuValues.soilMoistureAvg7d,
            iconEuSoilMoistureMin7d:
              normalized.iconEuValues.soilMoistureMin7d,
          };
        }),
        terrainThermalDeltaAtFinding: Object.fromEntries(
          TERRAIN_THERMAL_FIELDS.map((field) => {
            const baseline = findingDay.atmosphere.values[field];
            const local = findingDay.localAtmosphere.values[field];
            return [
              field,
              finiteNumber(baseline) && finiteNumber(local) ? local - baseline : null,
            ];
          }),
        ),
        species,
        productionChanged: false,
      };
    }));

    const report = {
      reportVersion: HISTORICAL_FINDING_REPLAY_VERSION,
      generatedAt: new Date().toISOString(),
      trajectoryOffsetsDays: TRAJECTORY_DAY_OFFSETS,
      locations,
      summary: {
        locations: locations.length,
        speciesReplays: locations.reduce(
          (total, location) => total + location.species.length,
          0,
        ),
        completeAtmosphereContracts: locations.filter(
          (location) => location.providerContract.atmosphere.completeAtFinding,
        ).length,
        completeSoilContracts: locations.filter(
          (location) => location.providerContract.soil.completeAtFinding,
        ).length,
        productionChanges: 0,
      },
    };

    expect(report.locations).toHaveLength(findings.length);
    expect(report.locations.every((location) => location.productionChanged === false)).toBe(true);
    const compactReport = {
      reportVersion: report.reportVersion,
      generatedAt: report.generatedAt,
      trajectoryOffsetsDays: report.trajectoryOffsetsDays,
      locations: report.locations.map((location) => ({
        location: location.location,
        findingDate: location.findingDate,
        providerContract: location.providerContract,
        findingDayEnvironment: location.findingDayEnvironment,
        environmentTrajectory: location.environmentTrajectory,
        terrainThermalDeltaAtFinding: location.terrainThermalDeltaAtFinding,
        species: location.species.map((species) => ({
          speciesId: species.speciesId,
          commonName: species.commonName,
          staticHabitat: species.staticHabitat,
          trajectory: species.trajectory.map((point) => ({
            offsetDays: point.offsetDays,
            productionElevationReplay: {
              opportunityIndex: point.productionElevationReplay.opportunityIndex,
              fruitingConditionsScore: point.productionElevationReplay.fruitingConditionsScore,
              phenology: point.productionElevationReplay.components.phenology,
              water: point.productionElevationReplay.components.water,
              temperature: point.productionElevationReplay.components.temperature,
              extremes: point.productionElevationReplay.components.extremes,
            },
            localTerrainThermalShadow: {
              opportunityIndex: point.localTerrainThermalShadow.opportunityIndex,
              fruitingConditionsScore: point.localTerrainThermalShadow.fruitingConditionsScore,
              temperature: point.localTerrainThermalShadow.components.temperature,
              extremes: point.localTerrainThermalShadow.components.extremes,
            },
            iconEuSoilShadow: {
              opportunityIndex: point.iconEuSoilShadow.opportunityIndex,
              fruitingConditionsScore: point.iconEuSoilShadow.fruitingConditionsScore,
              water: point.iconEuSoilShadow.components.water,
            },
            rawProductionElevationReplay: point.rawProductionElevationReplay,
            rawLocalTerrainThermalShadow: point.rawLocalTerrainThermalShadow,
            rawIconEuSoilShadow: point.rawIconEuSoilShadow,
            available: point.unavailableFields.length === 0,
          })),
        })),
        productionChanged: location.productionChanged,
      })),
      summary: report.summary,
    };
    const output = process.env.HISTORICAL_FINDINGS_VERBOSE === "1"
      ? report
      : compactReport;
    console.log(JSON.stringify(output, null, 2));
  },
  120_000,
);
