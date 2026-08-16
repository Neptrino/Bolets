import { createHash } from "node:crypto";
import type { PredictionCell, SpeciesProfile, SuitabilityResult } from "@/src/lib/types";
import type { TerrainThermalComparison } from "@/src/lib/terrain-thermal";
import {
  clmsShadowValues,
  normalizeClmsManifest,
  normalizeClmsSample,
  type ClmsManifestInput,
  type ClmsSampleInput,
} from "@/supabase/functions/_shared/clms-soil";

export const PROVIDER_SHADOW_REPORT_VERSION = "provider-shadow-comparison-v1";
export const CLMS_COMPARISON_EVIDENCE_VERSION = "clms-shadow-comparison-evidence-v1";

export type PrivateComparisonPoint = {
  latitude: number;
  longitude: number;
};

export type ClmsComparisonEvidence = {
  evidenceVersion: typeof CLMS_COMPARISON_EVIDENCE_VERSION;
  snapshotDate: string;
  manifestSha256: string;
  evidenceSha256: string;
  completion: {
    complete: true;
    completedAt: string;
    expectedSampleCount: number;
    importedSampleCount: number;
    canonicalSampleCount: number;
  };
  provenance: {
    ssmProductId: string;
    ssmProductVersion: string;
    ssmNominalAt: string;
    ssmContentStart: string;
    ssmContentEnd: string;
    ssmPublishedAt: string;
    swiProductId: string;
    swiProductVersion: string;
    swiNominalAt: string;
    swiContentStart: string;
    swiContentEnd: string;
    swiPublishedAt: string;
  };
  sample: ReturnType<typeof normalizeClmsSample>;
};

export type TerrainComparisonEvidence = TerrainThermalComparison | {
  status: "request-failed";
  reason: "provider-request-failed";
  methodVersion: string;
};

export type PublishedProductionResult = Pick<
  SuitabilityResult,
  "opportunityIndex" | "fruitingConditionsScore" | "components"
>;

const MAX_PRIVATE_POINTS = 20;
const CLMS_PIXEL_DEGREES = 1 / 112;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

type ClmsComparisonCompletion = ClmsComparisonEvidence["completion"];

type ClmsComparisonEnvelopePayload = {
  evidenceVersion: unknown;
  manifest: ClmsManifestInput;
  completion: {
    complete?: unknown;
    completedAt?: unknown;
    expectedSampleCount?: unknown;
    importedSampleCount?: unknown;
    canonicalSampleCount?: unknown;
  };
  samples: ClmsSampleInput[];
};

type NormalizedClmsComparisonEnvelope = {
  evidenceVersion: typeof CLMS_COMPARISON_EVIDENCE_VERSION;
  manifest: ReturnType<typeof normalizeClmsManifest>;
  completion: ClmsComparisonCompletion;
  samples: Array<ReturnType<typeof normalizeClmsSample>>;
};

function finiteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("CLMS comparison evidence contains an unsupported value");
  return encoded;
}

function sha256(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function positiveInteger(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 100_000) {
    throw new Error(`${label} must be an integer between 1 and 100000`);
  }
  return Number(value);
}

function normalizeCompletion(
  input: ClmsComparisonEnvelopePayload["completion"],
  latestPublishedAt: string,
): ClmsComparisonCompletion {
  if (input.complete !== true) throw new Error("CLMS comparison evidence must come from a complete import");
  const completedMilliseconds = typeof input.completedAt === "string"
    ? Date.parse(input.completedAt)
    : Number.NaN;
  if (!Number.isFinite(completedMilliseconds)) {
    throw new Error("CLMS comparison completedAt must be an ISO timestamp");
  }
  const completedAt = new Date(completedMilliseconds).toISOString();
  if (completedAt < latestPublishedAt) {
    throw new Error("CLMS comparison completion predates its product provenance");
  }
  const expectedSampleCount = positiveInteger(
    input.expectedSampleCount,
    "CLMS expectedSampleCount",
  );
  const importedSampleCount = positiveInteger(
    input.importedSampleCount,
    "CLMS importedSampleCount",
  );
  const canonicalSampleCount = positiveInteger(
    input.canonicalSampleCount,
    "CLMS canonicalSampleCount",
  );
  if (
    expectedSampleCount !== importedSampleCount ||
    expectedSampleCount !== canonicalSampleCount
  ) {
    throw new Error("CLMS comparison evidence must cover the complete canonical atmosphere lattice");
  }
  return {
    complete: true,
    completedAt,
    expectedSampleCount,
    importedSampleCount,
    canonicalSampleCount,
  };
}

function normalizeClmsComparisonEnvelope(
  payload: ClmsComparisonEnvelopePayload,
): NormalizedClmsComparisonEnvelope {
  if (payload.evidenceVersion !== CLMS_COMPARISON_EVIDENCE_VERSION) {
    throw new Error("CLMS comparison evidence uses an unsupported schema version");
  }
  const manifest = normalizeClmsManifest(payload.manifest);
  const latestPublishedAt = manifest.ssm_published_at > manifest.swi_published_at
    ? manifest.ssm_published_at
    : manifest.swi_published_at;
  const completion = normalizeCompletion(payload.completion, latestPublishedAt);
  if (!Array.isArray(payload.samples) || payload.samples.length < 1 || payload.samples.length > MAX_PRIVATE_POINTS) {
    throw new Error(`CLMS comparison evidence must contain 1-${MAX_PRIVATE_POINTS} samples`);
  }
  const samples = payload.samples.map((sample) => normalizeClmsSample(
    record(sample, "CLMS comparison sample") as ClmsSampleInput,
  ));
  const uniquePointIds = new Set(samples.map((sample) => sample.atmosphere_point_id));
  if (uniquePointIds.size !== samples.length) {
    throw new Error("CLMS comparison evidence contains duplicate canonical atmosphere points");
  }
  samples.sort((left, right) => left.atmosphere_point_id.localeCompare(right.atmosphere_point_id));
  return {
    evidenceVersion: CLMS_COMPARISON_EVIDENCE_VERSION,
    manifest,
    completion,
    samples,
  };
}

export function clmsComparisonEvidenceSha256(payload: ClmsComparisonEnvelopePayload) {
  return sha256(normalizeClmsComparisonEnvelope(payload));
}

export function canonicalAtmospherePointIdForCell(cellId: string, gridSizeM: number) {
  const match = /^epsg25831:250:(-?\d+):(-?\d+)$/.exec(cellId);
  if (gridSizeM !== 250 || !match) {
    throw new Error("CLMS comparison requires a canonical 250 m prediction cell");
  }
  const x = Number(match[1]);
  const y = Number(match[2]);
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) {
    throw new Error("CLMS comparison cell coordinates are invalid");
  }
  return `open-meteo:arome-2500:${Math.floor(x / 10)}:${Math.floor(y / 10)}`;
}

export function assertClmsEvidenceMatchesCell(
  evidence: ClmsComparisonEvidence,
  cell: Pick<PredictionCell, "cellId" | "gridSizeM" | "values">,
) {
  const expectedPointId = canonicalAtmospherePointIdForCell(cell.cellId, cell.gridSizeM);
  if (evidence.sample.atmosphere_point_id !== expectedPointId) {
    throw new Error("CLMS comparison sample does not match the selected cell's canonical atmosphere point");
  }
  const latitude = cell.values.weatherGridLatitude;
  const longitude = cell.values.weatherGridLongitude;
  if (!finiteCoordinate(latitude) || !finiteCoordinate(longitude)) {
    throw new Error("The selected cell lacks canonical weather-grid coordinates");
  }
  const halfPixel = CLMS_PIXEL_DEGREES / 2 + 1e-9;
  if (
    Math.abs(evidence.sample.source_pixel_lat - latitude) > halfPixel ||
    Math.abs(evidence.sample.source_pixel_lon - longitude) > halfPixel
  ) {
    throw new Error("CLMS comparison sample pixel does not contain the selected cell's weather point");
  }
}

export function comparisonAppUrl(input: string | undefined, allowRemote: boolean) {
  let url: URL;
  try {
    url = new URL(input ?? "http://localhost:3101");
  } catch {
    throw new Error("SHADOW_COMPARE_APP_URL must be an absolute HTTP(S) URL");
  }
  if (
    !["http:", "https:"].includes(url.protocol) || url.username || url.password ||
    url.search || url.hash || (url.pathname !== "/" && url.pathname !== "")
  ) {
    throw new Error("SHADOW_COMPARE_APP_URL must be a root HTTP(S) origin without credentials or parameters");
  }
  const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
  if (!loopback.has(url.hostname) && !allowRemote) {
    throw new Error("Remote comparison origins require explicit SHADOW_COMPARE_ALLOW_REMOTE=1 opt-in");
  }
  return url.origin;
}

export function parsePrivateComparisonPoints(encoded: string): PrivateComparisonPoint[] {
  const parsed = JSON.parse(encoded) as unknown;
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > MAX_PRIVATE_POINTS) {
    throw new Error(`Private comparison input must contain 1-${MAX_PRIVATE_POINTS} points`);
  }
  return parsed.map((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Every private comparison point must be an object");
    }
    const { latitude, longitude } = value as Record<string, unknown>;
    if (
      !finiteCoordinate(latitude) || latitude < -90 || latitude > 90 ||
      !finiteCoordinate(longitude) || longitude < -180 || longitude > 180
    ) {
      throw new Error("Private comparison coordinates are invalid");
    }
    return { latitude, longitude };
  });
}

export function parseClmsComparisonEvidence(encoded: string): ClmsComparisonEvidence[] {
  const parsed = JSON.parse(encoded) as unknown;
  const envelope = record(parsed, "CLMS comparison evidence");
  const payload: ClmsComparisonEnvelopePayload = {
    evidenceVersion: envelope.evidenceVersion,
    manifest: record(envelope.manifest, "CLMS comparison manifest") as ClmsManifestInput,
    completion: record(envelope.completion, "CLMS comparison completion"),
    samples: envelope.samples as ClmsSampleInput[],
  };
  const normalized = normalizeClmsComparisonEnvelope(payload);
  const suppliedDigest = typeof envelope.evidenceSha256 === "string"
    ? envelope.evidenceSha256.toLowerCase()
    : "";
  const evidenceSha256 = sha256(normalized);
  if (!SHA256_PATTERN.test(suppliedDigest) || suppliedDigest !== evidenceSha256) {
    throw new Error("CLMS comparison evidence SHA-256 does not match its normalized manifest and samples");
  }
  const manifestSha256 = sha256(normalized.manifest);
  const provenance: ClmsComparisonEvidence["provenance"] = {
    ssmProductId: normalized.manifest.ssm_product_id,
    ssmProductVersion: normalized.manifest.ssm_product_version,
    ssmNominalAt: normalized.manifest.ssm_nominal_at,
    ssmContentStart: normalized.manifest.ssm_content_start,
    ssmContentEnd: normalized.manifest.ssm_content_end,
    ssmPublishedAt: normalized.manifest.ssm_published_at,
    swiProductId: normalized.manifest.swi_product_id,
    swiProductVersion: normalized.manifest.swi_product_version,
    swiNominalAt: normalized.manifest.swi_nominal_at,
    swiContentStart: normalized.manifest.swi_content_start,
    swiContentEnd: normalized.manifest.swi_content_end,
    swiPublishedAt: normalized.manifest.swi_published_at,
  };
  return normalized.samples.map((sample) => ({
    evidenceVersion: normalized.evidenceVersion,
    snapshotDate: normalized.manifest.snapshot_date,
    manifestSha256,
    evidenceSha256,
    completion: normalized.completion,
    provenance,
    sample,
  }));
}

function sameScore(
  published: PublishedProductionResult,
  replayed: SuitabilityResult,
) {
  return published.opportunityIndex === replayed.opportunityIndex &&
    published.fruitingConditionsScore === replayed.fruitingConditionsScore &&
    JSON.stringify(published.components) === JSON.stringify(replayed.components);
}

function terrainEvidence(
  comparison: TerrainComparisonEvidence,
  baselineMatchesPublished: boolean,
) {
  if (!baselineMatchesPublished) {
    return {
      provider: "Open-Meteo Météo-France AROME terrain sensitivity",
      status: "withheld" as const,
      revisedScore: null,
      withholdingReasons: ["local-production-replay-mismatch"] as const,
    };
  }
  if (comparison.status === "request-failed") {
    return {
      provider: "Open-Meteo Météo-France AROME terrain sensitivity",
      status: "withheld" as const,
      revisedScore: null,
      methodVersion: comparison.methodVersion,
      withholdingReasons: ["terrain-replay-provider-request-failed"] as const,
    };
  }
  if (comparison.status === "unavailable") {
    return {
      provider: "Open-Meteo Météo-France AROME terrain sensitivity",
      status: "withheld" as const,
      revisedScore: null,
      methodVersion: comparison.methodVersion,
      withholdingReasons: [`terrain-replay-${comparison.reason}`] as const,
    };
  }
  return {
    provider: "Open-Meteo Météo-France AROME terrain sensitivity",
    status: "diagnostic-candidate" as const,
    revisedScore: null,
    diagnosticCandidate: {
      opportunityIndex: comparison.terrainAdjusted.opportunityIndex,
      fruitingConditionsScore: comparison.terrainAdjusted.fruitingConditionsScore,
    },
    productionScoreChanged: false,
    confidence: comparison.confidence,
    methodVersion: comparison.methodVersion,
    representativeElevationM: comparison.representativeElevationM,
    localElevationM: comparison.localElevationM,
    elevationDeltaM: comparison.elevationDeltaM,
    atmosphericResolutionM: comparison.atmosphericResolutionM,
    soilMoistureResolutionM: comparison.soilMoistureResolutionM,
    changedFields: comparison.changedFields,
    limitations: comparison.limitations,
  };
}

function directAromeEvidence(species: SpeciesProfile) {
  return {
    provider: "Météo-France AROME 0.01-degree WCS",
    status: "withheld" as const,
    revisedScore: null,
    evidence: {
      nativeGridDegrees: 0.01,
      operationalArchiveDays: 5,
      requiredThermalHistoryDays: species.modelConfig.status === "supported"
        ? species.modelConfig.temperature.windowDays
        : null,
    },
    withholdingReasons: [
      "direct-source-observation-not-supplied",
      "insufficient-thermal-history",
      "provider-bridge-not-calibrated",
    ] as const,
  };
}

function clmsEvidence(evidence?: ClmsComparisonEvidence) {
  const baseReasons = [
    "relative-percent-units-not-production-volumetric-moisture",
    "seasonal-calibration-history-insufficient",
    "single-water-source-bridge-not-calibrated",
  ] as const;
  if (!evidence) {
    return {
      provider: "Copernicus CLMS SSM/SWI",
      status: "withheld" as const,
      revisedScore: null,
      evidence: null,
      withholdingReasons: ["source-evidence-not-supplied", ...baseReasons],
    };
  }

  const values = clmsShadowValues(evidence.sample);
  const qualityReasons = [
    values.surfaceSoilMoistureStatus === "unavailable"
      ? "surface-soil-moisture-quality-unavailable"
      : values.surfaceSoilMoistureStatus === "limited"
        ? "surface-soil-moisture-quality-limited"
        : null,
    values.soilWaterIndexT5Status === "unavailable"
      ? "soil-water-index-quality-unavailable"
      : values.soilWaterIndexT5Status === "limited"
        ? "soil-water-index-quality-limited"
        : null,
  ].filter((reason): reason is string => reason !== null);

  return {
    provider: "Copernicus CLMS SSM/SWI",
    status: "withheld" as const,
    revisedScore: null,
    evidence: {
      evidenceVersion: evidence.evidenceVersion,
      snapshotDate: evidence.snapshotDate,
      manifestSha256: evidence.manifestSha256,
      evidenceSha256: evidence.evidenceSha256,
      completion: evidence.completion,
      provenance: evidence.provenance,
      units: "relative-percent",
      ...values,
    },
    withholdingReasons: [...qualityReasons, ...baseReasons],
  };
}

export function buildProviderShadowLocationReport({
  location,
  species,
  published,
  productionReplay,
  terrainComparison,
  clms,
}: {
  location: number;
  species: SpeciesProfile;
  published: PublishedProductionResult;
  productionReplay: SuitabilityResult;
  terrainComparison: TerrainComparisonEvidence;
  clms?: ClmsComparisonEvidence;
}) {
  const baselineMatchesPublished = sameScore(published, productionReplay);
  return {
    location,
    speciesId: species.speciesId,
    production: {
      status: baselineMatchesPublished ? "reproduced" as const : "mismatch" as const,
      published: {
        opportunityIndex: published.opportunityIndex,
        fruitingConditionsScore: published.fruitingConditionsScore,
        components: published.components,
      },
      replayed: {
        opportunityIndex: productionReplay.opportunityIndex,
        fruitingConditionsScore: productionReplay.fruitingConditionsScore,
        components: productionReplay.components,
        modelVersion: productionReplay.modelVersion,
      },
    },
    shadows: {
      terrainThermal: terrainEvidence(terrainComparison, baselineMatchesPublished),
      directArome: directAromeEvidence(species),
      copernicusClms: clmsEvidence(clms),
    },
    productionChanged: false,
  };
}
