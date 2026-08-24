import {
  createAdminClient,
  finiteNumber,
  finishRun,
  json,
  refreshSpatialLevelConditionsAfterIngestion,
  startRun,
  verifyIngestionRequest,
} from "../_shared/pipeline.ts";
import {
  alignOpenMeteoHourlySeries,
  atmosphericHourlyVariables,
  configureOpenMeteoRollingAtmosphereRequest,
  configureOpenMeteoRollingSeamlessPrecipitationRequest,
  fetchOpenMeteoLocations,
  mergeOpenMeteoHourlyHistory,
  normalizeOpenMeteo,
  OpenMeteoRequestError,
  openMeteoRollingHistoryNeedsBootstrap,
  ROLLING_SEAMLESS_VARIABLES,
  type OpenMeteoEgressLane,
  type OpenMeteoLocation,
} from "../_shared/open-meteo.ts";
import {
  estimateOpenMeteoRequestUnits,
  recordOpenMeteoUsage,
} from "../_shared/provider-budget.ts";
import {
  buildStationCorrectedPrecipitation,
  normalizeStationMatrixRow,
  STATION_RAIN_SOURCE_VERSION,
  type StationHourSeries,
} from "../_shared/xema-rain.ts";

type WeatherPoint = {
  point_id: string;
  requested_lat: number;
  requested_lon: number;
  requested_elevation_m: number | null;
  native_resolution_m: number;
  model: string;
  soil_point_id: string | null;
};

type RollingStream = "arome-atmosphere" | "seamless-precipitation";
type SpatialJobKind = "precipitation-fallback" | "atmosphere";

type SpatialJob = {
  jobId: number;
  jobKind: SpatialJobKind;
  firstPointId: string;
  lastPointId: string;
  expectedPoints: number;
  leaseToken: string;
  attemptCount: number;
};

// Lease enough work to amortize queue and cold-start overhead while retaining
// the provider's proven 50-location request size below. A normal lease makes
// two sequential provider requests and stays comfortably inside pg_net's
// 120-second boundary; a failed second batch retries at most 100 points.
const JOB_SHARD_SIZE = 100;
const PROVIDER_BATCH_SIZE = 50;
const STATE_WRITE_BATCH_SIZE = 25;
const JOB_LEASE_SECONDS = 180;
const COMPLETE_CURSOR = "__complete__";
const CURSOR_PIPELINE = "spatial-atmosphere";
const ATMOSPHERE_STREAM: RollingStream = "arome-atmosphere";
const FALLBACK_STREAM: RollingStream = "seamless-precipitation";
function statePayload(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as OpenMeteoLocation
    : undefined;
}

async function readRollingStates(
  supabase: ReturnType<typeof createAdminClient>,
  stream: RollingStream,
  pointIds: string[],
) {
  if (!pointIds.length) return new Map<string, OpenMeteoLocation>();
  const { data, error } = await supabase
    .from("open_meteo_hourly_states")
    .select("point_id,payload")
    .eq("stream", stream)
    .in("point_id", pointIds);
  if (error) throw error;
  return new Map(
    (data ?? []).flatMap((row) => {
      const payload = statePayload(row.payload);
      return payload ? [[row.point_id as string, payload] as const] : [];
    }),
  );
}

function rollingStateRow(stream: RollingStream, pointId: string, payload: OpenMeteoLocation) {
  const times = Array.isArray(payload.hourly?.time) ? payload.hourly.time as unknown[] : [];
  const first = typeof times[0] === "number" ? times[0] : undefined;
  const last = typeof times.at(-1) === "number" ? times.at(-1) : undefined;
  if (first === undefined || last === undefined) {
    throw new Error(`Rolling state ${pointId} does not use a UTC epoch axis`);
  }
  return {
    stream,
    point_id: pointId,
    first_hour: new Date(first * 1000).toISOString(),
    last_hour: new Date(last * 1000).toISOString(),
    hour_count: times.length,
    payload,
    updated_at: new Date().toISOString(),
  };
}

async function writeRollingStates(
  supabase: ReturnType<typeof createAdminClient>,
  rows: ReturnType<typeof rollingStateRow>[],
) {
  for (let start = 0; start < rows.length; start += STATE_WRITE_BATCH_SIZE) {
    const { error } = await supabase
      .from("open_meteo_hourly_states")
      .upsert(rows.slice(start, start + STATE_WRITE_BATCH_SIZE), { onConflict: "stream,point_id" });
    if (error) throw error;
  }
}

function configureRollingRequest(
  stream: RollingStream,
  batch: WeatherPoint[],
  bootstrap: boolean,
) {
  const url = new URL("https://api.open-meteo.com/v1/meteofrance");
  url.searchParams.set("latitude", batch.map((point) => point.requested_lat).join(","));
  url.searchParams.set("longitude", batch.map((point) => point.requested_lon).join(","));
  if (stream === ATMOSPHERE_STREAM && batch.every((point) => point.requested_elevation_m !== null)) {
    url.searchParams.set("elevation", batch.map((point) => point.requested_elevation_m).join(","));
  }
  if (stream === ATMOSPHERE_STREAM) configureOpenMeteoRollingAtmosphereRequest(url, bootstrap);
  else configureOpenMeteoRollingSeamlessPrecipitationRequest(url, bootstrap);
  return url;
}

async function fetchRollingProvider(
  supabase: ReturnType<typeof createAdminClient>,
  points: WeatherPoint[],
  stream: RollingStream,
  variables: readonly string[],
  previous: Map<string, OpenMeteoLocation>,
  egressLane: OpenMeteoEgressLane,
) {
  const referenceAt = new Date().toISOString();
  const bootstrapByPoint = new Map(points.map((point) => [
    point.point_id,
    openMeteoRollingHistoryNeedsBootstrap(previous.get(point.point_id), variables, referenceAt),
  ]));
  const plans: Array<{ batch: WeatherPoint[]; url: URL }> = [];
  for (const bootstrap of [false, true]) {
    const selected = points.filter((point) => bootstrapByPoint.get(point.point_id) === bootstrap);
    for (let start = 0; start < selected.length; start += PROVIDER_BATCH_SIZE) {
      const batch = selected.slice(start, start + PROVIDER_BATCH_SIZE);
      plans.push({ batch, url: configureRollingRequest(stream, batch, bootstrap) });
    }
  }
  const estimatedUnits = plans.reduce(
    (total, plan) => total + estimateOpenMeteoRequestUnits(plan.url, plan.batch.length),
    0,
  );
  await recordOpenMeteoUsage(
    supabase,
    "spatial-atmosphere",
    estimatedUnits,
  );

  const merged = new Map<string, OpenMeteoLocation>();
  for (const plan of plans) {
    // One provider attempt per reservation. The leased job can retry, but a
    // failed attempt remains charged in the conservative quota ledger.
    const locations = await fetchOpenMeteoLocations(plan.url, stream, {
      attempts: 1,
      egressLane,
    });
    if (locations.length !== plan.batch.length) {
      throw new Error(`Open-Meteo ${stream} returned ${locations.length} of ${plan.batch.length} locations`);
    }
    plan.batch.forEach((point, index) => {
      merged.set(
        point.point_id,
        mergeOpenMeteoHourlyHistory(previous.get(point.point_id), locations[index], variables),
      );
    });
  }
  const { error: laneSuccessError } = await supabase.rpc("record_open_meteo_egress_success", {
    p_lane: egressLane,
  });
  if (laneSuccessError) {
    throw new Error(`Unable to record ${egressLane} Open-Meteo egress success: ${laneSuccessError.message}`);
  }
  await writeRollingStates(
    supabase,
    points.map((point) => rollingStateRow(stream, point.point_id, merged.get(point.point_id)!)),
  );
  return {
    locations: merged,
    bootstrapPoints: [...bootstrapByPoint.values()].filter(Boolean).length,
    estimatedUnits,
  };
}

function normalizeJob(value: unknown): SpatialJob | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const jobId = Number(row.job_id);
  const expectedPoints = Number(row.expected_points);
  const attemptCount = Number(row.attempt_count);
  if (
    !Number.isSafeInteger(jobId) ||
    (row.job_kind !== "precipitation-fallback" && row.job_kind !== "atmosphere") ||
    typeof row.first_point_id !== "string" ||
    typeof row.last_point_id !== "string" ||
    !Number.isInteger(expectedPoints) ||
    typeof row.lease_token !== "string" ||
    !Number.isInteger(attemptCount)
  ) return undefined;
  return {
    jobId,
    jobKind: row.job_kind,
    firstPointId: row.first_point_id,
    lastPointId: row.last_point_id,
    expectedPoints,
    leaseToken: row.lease_token,
    attemptCount,
  };
}

async function claimJob(
  supabase: ReturnType<typeof createAdminClient>,
  snapshotDate: string,
  egressLane: OpenMeteoEgressLane,
) {
  const { data, error } = await supabase.rpc("claim_spatial_atmosphere_job", {
    p_snapshot_date: snapshotDate,
    p_egress_lane: egressLane,
    p_shard_size: JOB_SHARD_SIZE,
    p_lease_seconds: JOB_LEASE_SECONDS,
  });
  if (error) throw error;
  const candidate = Array.isArray(data) ? data[0] : data;
  if (!candidate) return undefined;
  const job = normalizeJob(candidate);
  if (!job) throw new Error("Spatial atmosphere job claim returned an invalid row");
  return job;
}

async function readJobPoints(
  supabase: ReturnType<typeof createAdminClient>,
  job: SpatialJob,
) {
  const model = job.jobKind === "atmosphere" ? "arome_france" : "best_match";
  const { data, error } = await supabase
    .from("weather_grid_points")
    .select("point_id,requested_lat,requested_lon,requested_elevation_m,native_resolution_m,model,soil_point_id")
    .eq("model", model)
    .gte("point_id", job.firstPointId)
    .lte("point_id", job.lastPointId)
    .order("point_id");
  if (error) throw error;
  const points = (data ?? []) as WeatherPoint[];
  if (points.length !== job.expectedPoints) {
    throw new Error(
      `Spatial ${job.jobKind} shard expected ${job.expectedPoints} points but found ${points.length}`,
    );
  }
  return points;
}

async function completeJob(
  supabase: ReturnType<typeof createAdminClient>,
  job: SpatialJob,
  rowsWritten: number,
) {
  const { data, error } = await supabase.rpc("complete_spatial_atmosphere_job", {
    p_job_id: job.jobId,
    p_lease_token: job.leaseToken,
    p_rows_written: rowsWritten,
  });
  if (error) throw error;
  return data === true;
}

async function deferJob(
  supabase: ReturnType<typeof createAdminClient>,
  job: SpatialJob,
  message: string,
  delaySeconds: number,
) {
  const { data, error } = await supabase.rpc("defer_spatial_atmosphere_job", {
    p_job_id: job.jobId,
    p_lease_token: job.leaseToken,
    p_error: message,
    p_delay_seconds: delaySeconds,
  });
  if (error) throw error;
  return data === true;
}

async function loadFallbackForAtmosphere(
  supabase: ReturnType<typeof createAdminClient>,
  points: WeatherPoint[],
) {
  const fallbackIds = [...new Set(points.map((point) => point.soil_point_id).filter(
    (pointId): pointId is string => Boolean(pointId),
  ))];
  if (!fallbackIds.length) throw new Error("Atmospheric shard has no precipitation fallback points");
  const [{ data: fallbackData, error: fallbackError }, states] = await Promise.all([
    supabase
      .from("weather_grid_points")
      .select("point_id,requested_lat,requested_lon,requested_elevation_m,native_resolution_m,model,soil_point_id")
      .eq("model", "best_match")
      .in("point_id", fallbackIds),
    readRollingStates(supabase, FALLBACK_STREAM, fallbackIds),
  ]);
  if (fallbackError) throw fallbackError;
  const fallbackPoints = new Map(
    ((fallbackData ?? []) as WeatherPoint[]).map((point) => [point.point_id, point]),
  );
  for (const pointId of fallbackIds) {
    const location = states.get(pointId);
    if (
      !fallbackPoints.has(pointId) ||
      !location ||
      openMeteoRollingHistoryNeedsBootstrap(location, ROLLING_SEAMLESS_VARIABLES)
    ) throw new Error(`Precipitation fallback ${pointId} is unavailable or stale`);
  }
  return { locations: states, points: fallbackPoints };
}

async function alignFallbacksForAtmosphere(
  supabase: ReturnType<typeof createAdminClient>,
  points: WeatherPoint[],
  atmosphere: Map<string, OpenMeteoLocation>,
  fallback: Awaited<ReturnType<typeof loadFallbackForAtmosphere>>,
  egressLane: OpenMeteoEgressLane,
) {
  const misalignedIds = new Set<string>();
  for (const point of points) {
    const weatherLocation = atmosphere.get(point.point_id);
    const fallbackLocation = point.soil_point_id
      ? fallback.locations.get(point.soil_point_id)
      : undefined;
    const weatherTimes = Array.isArray(weatherLocation?.hourly?.time)
      ? weatherLocation.hourly.time as unknown[]
      : [];
    if (
      point.soil_point_id &&
      fallbackLocation &&
      alignOpenMeteoHourlySeries(fallbackLocation, "precipitation", weatherTimes)
        .some((value) => value === null)
    ) misalignedIds.add(point.soil_point_id);
  }
  if (!misalignedIds.size) return { refreshedPoints: 0, estimatedUnits: 0 };

  const fallbackPoints = [...misalignedIds].map((pointId) => {
    const point = fallback.points.get(pointId);
    if (!point) throw new Error(`Precipitation fallback point ${pointId} is unavailable`);
    return point;
  });
  const refreshed = await fetchRollingProvider(
    supabase,
    fallbackPoints,
    FALLBACK_STREAM,
    ROLLING_SEAMLESS_VARIABLES,
    fallback.locations,
    egressLane,
  );
  for (const [pointId, location] of refreshed.locations) {
    fallback.locations.set(pointId, location);
  }
  return {
    refreshedPoints: fallbackPoints.length,
    estimatedUnits: refreshed.estimatedUnits,
  };
}

async function fetchGaugeMatrix(supabase: ReturnType<typeof createAdminClient>) {
  const { data, error } = await supabase.rpc("get_xema_rain_matrix", { p_hours: 744 });
  if (error) {
    console.error("Gauge matrix read failed; past rain falls back to the model blend", {
      message: error.message,
    });
    return [];
  }
  return (Array.isArray(data) ? data : [])
    .map(normalizeStationMatrixRow)
    .filter((station): station is StationHourSeries => station !== undefined);
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  let job: SpatialJob | undefined;
  let supabase: ReturnType<typeof createAdminClient> | undefined;
  let egressLane: OpenMeteoEgressLane = "direct";
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    }
    supabase = createAdminClient();
    if (!await verifyIngestionRequest(request, supabase)) {
      return json({ error: "Unauthorized ingestion request" }, 401);
    }
    const today = new Date().toISOString().slice(0, 10);
    const body = await request.json().catch(() => ({})) as {
      trigger?: "cron" | "manual";
      lane?: OpenMeteoEgressLane;
    };
    egressLane = body.lane ?? "direct";
    if (egressLane !== "direct" && egressLane !== "cloudflare" && egressLane !== "aws") {
      return json({ error: "Invalid Open-Meteo egress lane" }, 400);
    }

    const { data: cursor, error: cursorError } = await supabase
      .from("pipeline_cursors")
      .select("snapshot_date,last_cell_id")
      .eq("pipeline", CURSOR_PIPELINE)
      .maybeSingle();
    if (cursorError) throw cursorError;
    if (cursor?.snapshot_date === today && cursor.last_cell_id === COMPLETE_CURSOR) {
      const conditionsRefreshed = await refreshSpatialLevelConditionsAfterIngestion(supabase, today);
      return json({
        refreshed: 0,
        complete: true,
        conditionsRefreshed,
        snapshotDate: today,
      });
    }

    job = await claimJob(supabase, today, egressLane);
    if (!job) {
      return json({
        refreshed: 0,
        complete: false,
        deferred: true,
        reason: "lane-busy-or-no-ready-job",
        egressLane,
        snapshotDate: today,
      }, 202);
    }

    runId = await startRun(
      supabase,
      "spatial-atmosphere",
      body.trigger === "manual" ? "manual" : "cron",
      today,
      {
        jobId: job.jobId,
        jobKind: job.jobKind,
        attempt: job.attemptCount,
        egressLane,
        shardSize: JOB_SHARD_SIZE,
        rollingHistoryHours: 720,
        providerOverlapHours: 72,
      },
    );

    const points = await readJobPoints(supabase, job);
    if (job.jobKind === "precipitation-fallback") {
      const previous = await readRollingStates(
        supabase,
        FALLBACK_STREAM,
        points.map((point) => point.point_id),
      );
      const fallbackRefresh = await fetchRollingProvider(
        supabase,
        points,
        FALLBACK_STREAM,
        ROLLING_SEAMLESS_VARIABLES,
        previous,
        egressLane,
      );
      const generationComplete = await completeJob(supabase, job, 0);
      await finishRun(supabase, runId, "succeeded", {
        rowsRead: points.length,
        rowsWritten: points.length,
        metadata: {
          jobId: job.jobId,
          jobKind: job.jobKind,
          attempt: job.attemptCount,
          egressLane,
          shardSize: JOB_SHARD_SIZE,
          rollingStatesWritten: points.length,
          precipitationFallbackModel: "meteofrance_seamless",
          precipitationFallbackResolutionM: 9000,
          precipitationFallbackBootstrapPoints: fallbackRefresh.bootstrapPoints,
          estimatedOpenMeteoUnits: fallbackRefresh.estimatedUnits,
        },
      });
      return json({
        runId,
        jobId: job.jobId,
        jobKind: job.jobKind,
        egressLane,
        refreshed: points.length,
        complete: generationComplete,
        snapshotDate: today,
      });
    }

    const previousWeather = await readRollingStates(
      supabase,
      ATMOSPHERE_STREAM,
      points.map((point) => point.point_id),
    );
    const weatherRefresh = await fetchRollingProvider(
      supabase,
      points,
      ATMOSPHERE_STREAM,
      atmosphericHourlyVariables,
      previousWeather,
      egressLane,
    );
    const [fallback, gaugeStations] = await Promise.all([
      loadFallbackForAtmosphere(supabase, points),
      fetchGaugeMatrix(supabase),
    ]);
    // The fallback phase normally finishes only minutes before atmosphere.
    // If a model update lands between phases, repair just the linked coarse
    // points through the same leased lane instead of publishing a rain gap.
    const fallbackAlignment = await alignFallbacksForAtmosphere(
      supabase,
      points,
      weatherRefresh.locations,
      fallback,
      egressLane,
    );
    const observedAt = new Date().toISOString();
    const rows = points.map((point) => {
      const location = weatherRefresh.locations.get(point.point_id)!;
      if (!point.soil_point_id) {
        throw new Error(`Atmospheric point ${point.point_id} has no coarse fallback point`);
      }
      const fallbackLocation = fallback.locations.get(point.soil_point_id);
      const fallbackPoint = fallback.points.get(point.soil_point_id);
      if (!fallbackLocation || !fallbackPoint) {
        throw new Error(`Precipitation fallback ${point.soil_point_id} is unavailable`);
      }
      const aromeTimes = Array.isArray(location.hourly?.time)
        ? location.hourly.time as unknown[]
        : [];
      const fallbackSeries = alignOpenMeteoHourlySeries(
        fallbackLocation,
        "precipitation",
        aromeTimes,
      );
      if (fallbackSeries.some((value) => value === null)) {
        throw new Error(`Precipitation fallback ${point.soil_point_id} does not cover the atmospheric window`);
      }
      const corrected = buildStationCorrectedPrecipitation(
        aromeTimes,
        fallbackSeries,
        gaugeStations,
        point.requested_lat,
        point.requested_lon,
      );
      const correctedLocation: OpenMeteoLocation = {
        ...location,
        hourly: { ...location.hourly, precipitation: corrected.series },
      };
      const gaugeCoverage = corrected.totalHours
        ? Math.round((corrected.gaugeHours / corrected.totalHours) * 100) / 100
        : 0;
      const normalized = normalizeOpenMeteo(correctedLocation, correctedLocation, "atmosphere");
      return {
        point_id: point.point_id,
        snapshot_date: today,
        observed_at: observedAt,
        sources: [
          "Météo-France AROME via Open-Meteo",
          "Météo-France seamless precipitation via Open-Meteo",
          ...(gaugeCoverage > 0 ? ["Meteocat XEMA station gauges"] : []),
        ],
        source_resolution_m: Math.max(point.native_resolution_m, fallbackPoint.native_resolution_m),
        confidence: normalized.unavailableFields.length ? "limited" : "moderate",
        stale: false,
        unavailable_fields: normalized.unavailableFields,
        values: {
          ...normalized.values,
          weatherModel: "Météo-France AROME France",
          precipitationSource: STATION_RAIN_SOURCE_VERSION,
          precipitationFallbackModel: "meteofrance_seamless",
          precipitationFallbackResolutionM: fallbackPoint.native_resolution_m,
          precipitationGaugeCoverage: gaugeCoverage,
          atmosphericResolutionM: 2500,
          soilMoistureResolutionM: 9000,
          weatherGridLatitude: finiteNumber(location.latitude),
          weatherGridLongitude: finiteNumber(location.longitude),
          weatherElevationM: finiteNumber(location.elevation),
        },
        run_id: runId,
      };
    });

    const { error: snapshotError } = await supabase
      .from("weather_grid_snapshots")
      .upsert(rows, { onConflict: "point_id,snapshot_date" });
    if (snapshotError) throw snapshotError;
    const generationComplete = await completeJob(supabase, job, rows.length);
    await finishRun(
      supabase,
      runId,
      rows.some((row) => row.unavailable_fields.length) ? "partial" : "succeeded",
      {
        rowsRead: points.length,
        rowsWritten: rows.length,
        metadata: {
          jobId: job.jobId,
          jobKind: job.jobKind,
          attempt: job.attemptCount,
          egressLane,
          shardSize: JOB_SHARD_SIZE,
          firstPointId: points[0].point_id,
          lastPointId: points.at(-1)?.point_id,
          atmosphericModel: "arome_france",
          rollingHistoryHours: 720,
          providerOverlapHours: 72,
          precipitationSource: STATION_RAIN_SOURCE_VERSION,
          precipitationFallbackModel: "meteofrance_seamless",
          precipitationFallbackResolutionM: 9000,
          fallbackAlignmentPoints: fallbackAlignment.refreshedPoints,
          fallbackAlignmentEstimatedOpenMeteoUnits: fallbackAlignment.estimatedUnits,
          estimatedOpenMeteoUnits: weatherRefresh.estimatedUnits,
          atmosphericBootstrapPoints: weatherRefresh.bootstrapPoints,
          gaugeStationCount: gaugeStations.length,
          atmosphericResolutionM: 2500,
          soilMoistureResolutionM: 9000,
        },
      },
    );
    const conditionsRefreshed = generationComplete
      ? await refreshSpatialLevelConditionsAfterIngestion(supabase, today)
      : false;
    return json({
      runId,
      jobId: job.jobId,
      jobKind: job.jobKind,
      egressLane,
      refreshed: rows.length,
      complete: generationComplete,
      conditionsRefreshed,
      snapshotDate: today,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isEgressRateLimited = error instanceof OpenMeteoRequestError && error.status === 429;
    let laneBlockedUntil: string | undefined;
    if (isEgressRateLimited && supabase) {
      try {
        const { data, error: laneError } = await supabase.rpc("defer_open_meteo_egress_lane", {
          p_lane: error.egressLane,
          p_http_status: error.status,
          p_retry_after_seconds: error.retryAfterSeconds ?? null,
          p_error: message,
        });
        if (laneError) throw laneError;
        if (typeof data === "string") laneBlockedUntil = data;
      } catch (laneError) {
        console.error("Unable to pause rate-limited Open-Meteo egress lane", {
          egressLane: error.egressLane,
          message: laneError instanceof Error ? laneError.message : "Unknown lane deferral error",
        });
      }
    }
    if (job && supabase) {
      try {
        const delay = isEgressRateLimited
          ? 5
          : Math.min(900, 30 * (2 ** Math.min(job.attemptCount - 1, 5)));
        await deferJob(supabase, job, message, delay);
      } catch (deferError) {
        console.error("Unable to defer spatial atmosphere job", {
          jobId: job.jobId,
          message: deferError instanceof Error ? deferError.message : "Unknown deferral error",
        });
      }
    }
    if (runId && supabase) {
      try {
        await finishRun(supabase, runId, "failed", {
          errorMessage: message,
          metadata: {
            jobId: job?.jobId,
            jobKind: job?.jobKind,
            attempt: job?.attemptCount,
            egressLane,
            shardSize: JOB_SHARD_SIZE,
            reason: isEgressRateLimited ? "egress-rate-limit" : "job-failed",
            ...(isEgressRateLimited
              ? {
                providerStatus: error.status,
                retryAfterSeconds: error.retryAfterSeconds,
                laneBlockedUntil,
              }
              : {}),
          },
        });
      } catch (finishError) {
        console.error("Unable to record failed spatial refresh", finishError);
      }
    }
    if (isEgressRateLimited) {
      return json({
        runId,
        jobId: job?.jobId,
        refreshed: 0,
        complete: false,
        deferred: true,
        reason: "egress-rate-limit",
        egressLane: error.egressLane,
        laneBlockedUntil,
      }, 202);
    }
    console.error("Spatial environmental refresh failed", {
      runId,
      jobId: job?.jobId,
      egressLane,
      message,
    });
    return json({ error: "Spatial environmental refresh failed", runId, jobId: job?.jobId }, 500);
  }
});
