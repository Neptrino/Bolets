import { createAdminClient, finiteNumber, finishRun, json, requireServiceRole, startRun, verifyNamedToken } from "../_shared/pipeline.ts";
import { packLandCoverFractions } from "../_shared/land-cover.ts";
import { regionIds } from "../_shared/regions.ts";

type CellInput = {
  cellId?: unknown;
  regionId?: unknown;
  bounds?: unknown;
  staticValues?: unknown;
  sources?: unknown;
  sourceResolutionM?: unknown;
  confidence?: unknown;
  sourceObservedAt?: unknown;
  weatherPoint?: unknown;
};

type WeatherPointInput = { pointId?: unknown; latitude?: unknown; longitude?: unknown; nativeResolutionM?: unknown; elevationM?: unknown };
type CoverSampleInput = { cellId?: unknown; packed?: unknown };
type GeologyUnitInput = {
  unitId?: unknown;
  code?: unknown;
  description?: unknown;
  class?: unknown;
  substrateClass?: unknown;
  classificationVersion?: unknown;
};
type GeologyEvidenceInput = {
  cellId?: unknown;
  classCoveragesPacked?: unknown;
  mappedCoveragePercent?: unknown;
  dominantUnitId?: unknown;
  dominantUnitCoveragePercent?: unknown;
};

const confidenceValues = new Set(["high", "moderate", "limited", "unknown"]);
const geologyClasses = new Set(["silicic", "calcareous", "mixed", "unconsolidated", "unknown"]);
const hasTextArray = (value: unknown) => Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim());

function validCellId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9:_-]{3,120}$/i.test(value);
}

function normaliseCoverSample(input: CoverSampleInput) {
  if (!validCellId(input.cellId)) {
    throw new Error("Invalid cover-sample cellId");
  }
  if (typeof input.packed !== "string" || !/^\d{1,14}$/.test(input.packed)) {
    throw new Error(`Invalid packed cover samples for ${input.cellId}`);
  }
  const packed = BigInt(input.packed);
  if (packed < 1n || packed > 35_184_372_088_831n) {
    throw new Error(`Invalid packed cover samples for ${input.cellId}`);
  }
  return { cell_id: input.cellId, packed: input.packed };
}

function normaliseGeologyUnit(input: GeologyUnitInput) {
  if (!Number.isInteger(input.unitId) || Number(input.unitId) < 1 || Number(input.unitId) > 2047) {
    throw new Error("Invalid geology unit ID");
  }
  const code = typeof input.code === "string" ? input.code.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!code || code.length > 64) throw new Error(`Invalid geology unit code for ${input.unitId}`);
  if (!description || description.length > 1000) throw new Error(`Invalid geology unit description for ${code}`);
  const substrateClass = input.class ?? input.substrateClass;
  if (typeof substrateClass !== "string" || !geologyClasses.has(substrateClass)) {
    throw new Error(`Invalid geology class for ${code}`);
  }
  if (input.classificationVersion !== undefined && input.classificationVersion !== 1) {
    throw new Error(`Unsupported geology classification version for ${code}`);
  }
  return {
    unitId: Number(input.unitId),
    code,
    description,
    class: substrateClass,
    classificationVersion: 1,
  };
}

function normaliseGeologyEvidence(input: GeologyEvidenceInput) {
  if (!validCellId(input.cellId)) throw new Error("Invalid geology-evidence cellId");
  if (!Number.isInteger(input.classCoveragesPacked) || Number(input.classCoveragesPacked) < 0 ||
      Number(input.classCoveragesPacked) > 268_435_455) {
    throw new Error(`Invalid packed geology coverage for ${input.cellId}`);
  }
  const packed = Number(input.classCoveragesPacked);
  const lanes = [0, 7, 14, 21].map((shift) => (packed >> shift) & 127);
  if (lanes.some((coverage) => coverage > 100)) {
    throw new Error(`Invalid geology coverage lane for ${input.cellId}`);
  }
  if (!Number.isInteger(input.mappedCoveragePercent) || Number(input.mappedCoveragePercent) < 1 ||
      Number(input.mappedCoveragePercent) > 100 ||
      lanes.reduce((total, coverage) => total + coverage, 0) > Number(input.mappedCoveragePercent)) {
    throw new Error(`Invalid mapped geology coverage for ${input.cellId}`);
  }
  const hasUnitId = input.dominantUnitId !== undefined && input.dominantUnitId !== null;
  const hasUnitCoverage = input.dominantUnitCoveragePercent !== undefined && input.dominantUnitCoveragePercent !== null;
  if (hasUnitId !== hasUnitCoverage) throw new Error(`Incomplete dominant geology unit for ${input.cellId}`);
  if (hasUnitId && (!Number.isInteger(input.dominantUnitId) || Number(input.dominantUnitId) < 1 ||
      Number(input.dominantUnitId) > 2047 || !Number.isInteger(input.dominantUnitCoveragePercent) ||
      Number(input.dominantUnitCoveragePercent) < 1 ||
      Number(input.dominantUnitCoveragePercent) > Number(input.mappedCoveragePercent))) {
    throw new Error(`Invalid dominant geology unit for ${input.cellId}`);
  }
  return {
    cellId: input.cellId,
    classCoveragesPacked: packed,
    mappedCoveragePercent: Number(input.mappedCoveragePercent),
    ...(hasUnitId
      ? {
          dominantUnitId: Number(input.dominantUnitId),
          dominantUnitCoveragePercent: Number(input.dominantUnitCoveragePercent),
        }
      : {}),
  };
}

function normaliseCell(input: CellInput) {
  if (typeof input.cellId !== "string" || !/^[a-z0-9:_-]{3,120}$/i.test(input.cellId)) throw new Error("Invalid cellId");
  if (typeof input.regionId !== "string" || !regionIds.has(input.regionId)) throw new Error(`Invalid region for ${input.cellId}`);
  if (!Array.isArray(input.bounds) || input.bounds.length !== 2 || !input.bounds.every((point) => Array.isArray(point) && point.length === 2)) throw new Error(`Invalid bounds for ${input.cellId}`);
  const [[west, south], [east, north]] = input.bounds as unknown[][];
  const coordinates = [west, south, east, north].map(finiteNumber);
  if (coordinates.some((value) => value === undefined)) throw new Error(`Non-numeric bounds for ${input.cellId}`);
  if (!(coordinates[0]! < coordinates[2]! && coordinates[1]! < coordinates[3]!)) throw new Error(`Inverted bounds for ${input.cellId}`);
  const inputStaticValues = input.staticValues && typeof input.staticValues === "object" && !Array.isArray(input.staticValues) ? input.staticValues as Record<string, unknown> : {};
  const coverFractions = packLandCoverFractions(inputStaticValues.landCoverFractions, input.cellId);
  const staticValues = { ...inputStaticValues };
  delete staticValues.landCoverFractions;
  const sources = Array.isArray(input.sources) ? input.sources.filter((source): source is string => typeof source === "string" && source.length > 0) : [];
  const sourceResolutionM = finiteNumber(input.sourceResolutionM);
  const confidence = typeof input.confidence === "string" && confidenceValues.has(input.confidence) ? input.confidence : "unknown";
  if (!sourceResolutionM || sourceResolutionM < 1) throw new Error(`Invalid source resolution for ${input.cellId}`);
  const terrainReady = finiteNumber(staticValues.altitudeM) !== undefined;
  const forestReady = hasTextArray(staticValues.forestTypes) || hasTextArray(staticValues.treeSpecies);
  const soilReady = finiteNumber(staticValues.soilPh) !== undefined || typeof staticValues.soilTexture === "string";
  const staticVerified = terrainReady && forestReady && soilReady && sources.length >= 2 && confidence !== "unknown";
  const weatherInput = input.weatherPoint && typeof input.weatherPoint === "object" && !Array.isArray(input.weatherPoint)
    ? input.weatherPoint as WeatherPointInput
    : {};
  if (typeof weatherInput.pointId !== "string" || !/^open-meteo:[a-z0-9:-]+$/i.test(weatherInput.pointId)) throw new Error(`Invalid weather point for ${input.cellId}`);
  const latitude = finiteNumber(weatherInput.latitude);
  const longitude = finiteNumber(weatherInput.longitude);
  if (latitude === undefined || latitude < -90 || latitude > 90 || longitude === undefined || longitude < -180 || longitude > 180) {
    throw new Error(`Invalid weather coordinates for ${input.cellId}`);
  }
  const highResolution = weatherInput.pointId.startsWith("open-meteo:arome-2500:");
  const nativeResolutionM = finiteNumber(weatherInput.nativeResolutionM) ?? (highResolution ? 2500 : 9000);
  const elevationM = finiteNumber(weatherInput.elevationM);

  return {
    cell: {
      cell_id: input.cellId,
      region_id: input.regionId,
      grid_size_m: 250,
      west: coordinates[0],
      south: coordinates[1],
      east: coordinates[2],
      north: coordinates[3],
      static_values: staticValues,
      habitat_cover_counts: coverFractions?.packed ?? null,
      habitat_cover_codes: null,
      habitat_cover_shares: null,
      static_sources: sources,
      source_resolution_m: Math.round(sourceResolutionM),
      confidence,
      static_verified: staticVerified,
      source_observed_at: typeof input.sourceObservedAt === "string" ? input.sourceObservedAt : null,
      weather_point_id: weatherInput.pointId,
      updated_at: new Date().toISOString()
    },
    weatherPoint: {
      point_id: weatherInput.pointId,
      provider: "open-meteo",
      requested_lat: latitude,
      requested_lon: longitude,
      requested_elevation_m: elevationM,
      native_resolution_m: Math.round(nativeResolutionM),
      model: highResolution ? "arome_france" : "best_match",
      updated_at: new Date().toISOString()
    }
  };
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const supabase = createAdminClient();
    if (!requireServiceRole(request) && !await verifyNamedToken(request, supabase, "x-spatial-import-token", "spatial-import")) {
      return json({ error: "Trusted spatial-import authorization required" }, 403);
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > 2_000_000) return json({ error: "Import payload is too large" }, 413);
    const payload = await request.json() as {
      cells?: CellInput[];
      coverSamples?: CoverSampleInput[];
      geologyUnits?: GeologyUnitInput[];
      geologyEvidence?: GeologyEvidenceInput[];
      refreshGeologyLevel?: unknown;
    };
    if (Array.isArray(payload.geologyUnits)) {
      if (!payload.geologyUnits.length || payload.geologyUnits.length > 2000) {
        return json({ error: "Provide between 1 and 2,000 geology units" }, 400);
      }
      const units = payload.geologyUnits.map(normaliseGeologyUnit);
      const { data, error } = await supabase.rpc("upsert_geology_units", { p_rows: units });
      if (error) throw error;
      return json({ received: units.length, updated: Number(data ?? 0) });
    }
    if (Array.isArray(payload.geologyEvidence)) {
      if (!payload.geologyEvidence.length || payload.geologyEvidence.length > 1000) {
        return json({ error: "Provide between 1 and 1,000 geology evidence rows" }, 400);
      }
      const rows = payload.geologyEvidence.map(normaliseGeologyEvidence);
      const snapshotDate = new Date().toISOString().slice(0, 10);
      runId = await startRun(supabase, "spatial-static-import", "import", snapshotDate, {
        dataset: "icgc-geology-50k-v3",
        requestedCells: rows.length,
      });
      const { data, error } = await supabase.rpc("backfill_spatial_geology_evidence", { p_rows: rows });
      if (error) throw error;
      const updated = Number(data ?? 0);
      if (!Number.isInteger(updated) || updated < 0 || updated > rows.length) {
        throw new Error("Invalid geology backfill write result");
      }
      await finishRun(supabase, runId, "succeeded", {
        rowsRead: rows.length,
        rowsWritten: updated,
        metadata: { unchanged: rows.length - updated, dataset: "icgc-geology-50k-v3" },
      });
      return json({ runId, received: rows.length, updated });
    }
    if (payload.refreshGeologyLevel !== undefined) {
      const gridSizeM = finiteNumber(payload.refreshGeologyLevel);
      if (!gridSizeM || ![1000, 2500, 5000, 10000].includes(gridSizeM)) {
        return json({ error: "Unsupported geology aggregation level" }, 400);
      }
      const { data, error } = await supabase.rpc("refresh_spatial_geology_level", {
        p_grid_size_m: gridSizeM,
      });
      if (error) throw error;
      return json({ gridSizeM, updated: Number(data ?? 0) });
    }
    if (Array.isArray(payload.coverSamples)) {
      if (!payload.coverSamples.length || payload.coverSamples.length > 5000) {
        return json({ error: "Provide between 1 and 5,000 cover samples" }, 400);
      }
      const coverSamples = payload.coverSamples.map(normaliseCoverSample);
      const { data, error } = await supabase.rpc("backfill_spatial_habitat_cover_counts", { p_rows: coverSamples });
      if (error) throw error;
      return json({ received: coverSamples.length, updated: Number(data ?? 0) });
    }
    if (!Array.isArray(payload.cells) || !payload.cells.length || payload.cells.length > 1000) return json({ error: "Provide between 1 and 1,000 cells" }, 400);

    const snapshotDate = new Date().toISOString().slice(0, 10);
    runId = await startRun(supabase, "spatial-static-import", "import", snapshotDate, { requestedCells: payload.cells.length });
    const normalized = payload.cells.map(normaliseCell);
    const rows = normalized.map((item) => item.cell);
    const weatherPoints = [...new Map(normalized.map((item) => [item.weatherPoint.point_id, item.weatherPoint])).values()];
    const { data: writeResult, error } = await supabase.rpc("upsert_spatial_import_batch", {
      p_cells: rows,
      p_weather_points: weatherPoints
    });
    if (error) throw error;
    const writeCounts = writeResult && typeof writeResult === "object" && !Array.isArray(writeResult)
      ? writeResult as Record<string, unknown>
      : {};
    const cellsWritten = finiteNumber(writeCounts.cellsWritten);
    const weatherPointsWritten = finiteNumber(writeCounts.weatherPointsWritten);
    if (cellsWritten === undefined || !Number.isInteger(cellsWritten) || cellsWritten < 0 || cellsWritten > rows.length ||
      weatherPointsWritten === undefined || !Number.isInteger(weatherPointsWritten) ||
      weatherPointsWritten < 0 || weatherPointsWritten > weatherPoints.length) {
      throw new Error("Invalid spatial import write result");
    }
    await supabase.from("pipeline_cursors").delete().eq("pipeline", "spatial-environment");
    const verified = rows.filter((row) => row.static_verified).length;
    await finishRun(supabase, runId, verified === rows.length ? "succeeded" : "partial", {
      rowsRead: rows.length,
      rowsWritten: cellsWritten,
      metadata: {
        verified,
        withheld: rows.length - verified,
        unchanged: rows.length - cellsWritten,
        weatherPointsWritten
      }
    });
    return json({ runId, imported: rows.length, verified, withheld: rows.length - verified });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid spatial import";
    console.error("Spatial import failed", { runId, message });
    try {
      if (runId) await finishRun(createAdminClient(), runId, "failed", { errorMessage: message });
    } catch (finishError) {
      console.error("Unable to record failed spatial import", finishError);
    }
    return json({ error: message, runId }, 400);
  }
});
