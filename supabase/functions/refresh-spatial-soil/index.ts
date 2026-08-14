import { createAdminClient, finiteNumber, finishRun, json, refreshSpatialLevelConditionsAfterIngestion, startRun, verifyIngestionRequest } from "../_shared/pipeline.ts";
import {
  configureOpenMeteoForecastRequest,
  configureOpenMeteoRequest,
  fetchOpenMeteoLocations,
  normalizeOpenMeteo,
  normalizeOpenMeteoForecast,
  type OpenMeteoLocation,
} from "../_shared/open-meteo.ts";

type SoilPoint = {
  point_id: string;
  requested_lat: number;
  requested_lon: number;
  requested_elevation_m: number | null;
  native_resolution_m: number;
};

const BATCH_SIZE = 50;
const PROVIDER_BATCH_SIZE = 50;
const COMPLETE_CURSOR = "__complete__";
const SOIL_CURSOR_PIPELINE = "spatial-soil";
const FORECAST_CURSOR_PIPELINE = "spatial-forecast-v2";

type Settled<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

type ForecastReconciliation = {
  realigned: boolean;
  issueComplete: boolean;
  reason?: string;
  generatedAt?: string;
  previousGeneratedAt?: string;
  anchorGapSeconds?: number;
  deletedForecastRows?: number;
};

async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { data: await promise };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

async function recordForecastSourceState(
  supabase: ReturnType<typeof createAdminClient>,
  sourceId: string,
  error: string | undefined,
  checkedAt: string,
  successDetail: string,
  runId: string | undefined,
) {
  const { error: sourceError } = await supabase.from("pipeline_sources").update({
    status: error ? "degraded" : "active",
    status_detail: error
      ? `Five-day forecast fetch failed: ${error.slice(0, 300)}`
      : successDetail,
    checked_at: checkedAt,
    updated_at: checkedAt,
  }).eq("source_id", sourceId);
  if (sourceError) {
    console.error("Unable to update forecast provider state", {
      runId,
      sourceId,
      message: sourceError.message,
    });
  }
}

async function readPointBatch(
  supabase: ReturnType<typeof createAdminClient>,
  lastPointId: string | null,
) {
  let query = supabase
    .from("weather_grid_points")
    .select("point_id,requested_lat,requested_lon,requested_elevation_m,native_resolution_m")
    .eq("model", "best_match")
    .order("point_id")
    .limit(BATCH_SIZE);
  if (lastPointId) query = query.gt("point_id", lastPointId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SoilPoint[];
}

async function saveCursor(
  supabase: ReturnType<typeof createAdminClient>,
  pipeline: string,
  snapshotDate: string,
  lastCellId: string,
  updatedAt: string,
) {
  const { error } = await supabase.from("pipeline_cursors").upsert({
    pipeline,
    snapshot_date: snapshotDate,
    last_cell_id: lastCellId,
    updated_at: updatedAt,
  });
  if (error) throw error;
}

async function forecastIssueGeneratedAt(
  supabase: ReturnType<typeof createAdminClient>,
  snapshotDate: string,
) {
  const { data, error } = await supabase.rpc("allocate_weather_forecast_issue", {
    p_snapshot_date: snapshotDate,
    p_generated_at: new Date().toISOString(),
  });
  if (error) throw error;
  // All resumable batches for one date normalize against one base time. This
  // also lets coarse cells combine provider points that cross batch boundaries.
  if (typeof data !== "string") throw new Error("Forecast issue allocation returned no timestamp");
  return data;
}

async function reconcileForecastIssue(
  supabase: ReturnType<typeof createAdminClient>,
  snapshotDate: string,
) {
  const { data, error } = await supabase.rpc("reconcile_weather_forecast_issue", {
    p_snapshot_date: snapshotDate,
    p_max_anchor_gap: "8 hours",
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Forecast reconciliation returned an invalid result");
  }
  const result = data as Record<string, unknown>;
  return {
    realigned: result.realigned === true,
    issueComplete: result.issueComplete === true,
    reason: typeof result.reason === "string" ? result.reason : undefined,
    generatedAt: typeof result.generatedAt === "string" ? result.generatedAt : undefined,
    previousGeneratedAt: typeof result.previousGeneratedAt === "string"
      ? result.previousGeneratedAt
      : undefined,
    anchorGapSeconds: finiteNumber(result.anchorGapSeconds),
    deletedForecastRows: finiteNumber(result.deletedForecastRows),
  } satisfies ForecastReconciliation;
}

async function completeForecastIssue(
  supabase: ReturnType<typeof createAdminClient>,
  snapshotDate: string,
  generatedAt: string,
) {
  const { data, error } = await supabase.rpc("complete_weather_forecast_issue", {
    p_snapshot_date: snapshotDate,
    p_generated_at: generatedAt,
  });
  if (error) throw error;
  return data === true;
}

async function pruneForecastIssues(
  supabase: ReturnType<typeof createAdminClient>,
) {
  const { data, error } = await supabase.rpc("prune_weather_forecast_issues", {
    p_keep_complete: 1,
  });
  if (error) throw error;
  return data;
}

async function fetchSoil(points: SoilPoint[]) {
  const results: OpenMeteoLocation[] = [];
  for (let start = 0; start < points.length; start += PROVIDER_BATCH_SIZE) {
    const batch = points.slice(start, start + PROVIDER_BATCH_SIZE);
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", batch.map((point) => point.requested_lat).join(","));
    url.searchParams.set("longitude", batch.map((point) => point.requested_lon).join(","));
    if (batch.every((point) => point.requested_elevation_m !== null)) {
      url.searchParams.set("elevation", batch.map((point) => point.requested_elevation_m).join(","));
    }
    configureOpenMeteoRequest(url, "soil");
    results.push(...await fetchOpenMeteoLocations(url, "soil"));
  }
  if (results.length !== points.length) throw new Error(`Open-Meteo returned ${results.length} of ${points.length} soil locations`);
  return results;
}

async function fetchForecast(points: SoilPoint[], profile: "atmosphere" | "soil") {
  const results: OpenMeteoLocation[] = [];
  for (let start = 0; start < points.length; start += PROVIDER_BATCH_SIZE) {
    const batch = points.slice(start, start + PROVIDER_BATCH_SIZE);
    const url = new URL(profile === "atmosphere"
      ? "https://api.open-meteo.com/v1/ecmwf"
      : "https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", batch.map((point) => point.requested_lat).join(","));
    url.searchParams.set("longitude", batch.map((point) => point.requested_lon).join(","));
    if (batch.every((point) => point.requested_elevation_m !== null)) {
      url.searchParams.set("elevation", batch.map((point) => point.requested_elevation_m).join(","));
    }
    configureOpenMeteoForecastRequest(url, profile);
    results.push(...await fetchOpenMeteoLocations(url, `${profile} forecast`));
  }
  if (results.length !== points.length) {
    throw new Error(`Open-Meteo returned ${results.length} of ${points.length} ${profile} forecast locations`);
  }
  return results;
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  try {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    const supabase = createAdminClient();
    if (!await verifyIngestionRequest(request, supabase)) return json({ error: "Unauthorized ingestion request" }, 401);
    const today = new Date().toISOString().slice(0, 10);
    const body = await request.json().catch(() => ({})) as { trigger?: "cron" | "manual" };
    const forecastReconciliation = await reconcileForecastIssue(supabase, today);
    if (forecastReconciliation.issueComplete && !forecastReconciliation.realigned) {
      await saveCursor(
        supabase,
        FORECAST_CURSOR_PIPELINE,
        today,
        COMPLETE_CURSOR,
        new Date().toISOString(),
      );
    }
    const { data: cursors, error: cursorError } = await supabase
      .from("pipeline_cursors")
      .select("pipeline,snapshot_date,last_cell_id")
      .in("pipeline", [SOIL_CURSOR_PIPELINE, FORECAST_CURSOR_PIPELINE]);
    if (cursorError) throw cursorError;
    const lastPointId = (pipeline: string) => {
      const cursor = (cursors ?? []).find((candidate) => candidate.pipeline === pipeline);
      return cursor?.snapshot_date === today ? cursor.last_cell_id as string | null : null;
    };
    const soilLastPointId = lastPointId(SOIL_CURSOR_PIPELINE);
    const forecastLastPointId = lastPointId(FORECAST_CURSOR_PIPELINE);
    const soilAlreadyComplete = soilLastPointId === COMPLETE_CURSOR;
    const forecastAlreadyComplete = forecastLastPointId === COMPLETE_CURSOR;
    if (soilAlreadyComplete && forecastAlreadyComplete) {
      const conditionsRefreshed = await refreshSpatialLevelConditionsAfterIngestion(supabase, today);
      return json({ refreshed: 0, forecasted: 0, complete: true, conditionsRefreshed, snapshotDate: today });
    }

    runId = await startRun(
      supabase,
      "spatial-soil",
      body.trigger === "manual" ? "manual" : "cron",
      today,
      {
        batchSize: BATCH_SIZE,
        forecastCursor: FORECAST_CURSOR_PIPELINE,
        forecastReconciliation,
      },
    );
    const sharedPointBatch = !soilAlreadyComplete && !forecastAlreadyComplete &&
        soilLastPointId === forecastLastPointId
      ? readPointBatch(supabase, soilLastPointId)
      : undefined;
    const [soilPoints, forecastPoints] = await Promise.all([
      soilAlreadyComplete
        ? Promise.resolve([] as SoilPoint[])
        : sharedPointBatch ?? readPointBatch(supabase, soilLastPointId),
      forecastAlreadyComplete
        ? Promise.resolve([] as SoilPoint[])
        : sharedPointBatch ?? readPointBatch(supabase, forecastLastPointId),
    ]);
    const cursorUpdatedAt = new Date().toISOString();
    let soilErrorMessage: string | undefined;
    let forecastErrorMessage: string | undefined;
    if (!soilAlreadyComplete && !soilPoints.length) {
      const result = await settle(saveCursor(
        supabase,
        SOIL_CURSOR_PIPELINE,
        today,
        COMPLETE_CURSOR,
        cursorUpdatedAt,
      ));
      soilErrorMessage = result.error;
    }
    if (!forecastAlreadyComplete && !forecastPoints.length) {
      const completion = await settle((async () => {
        const generatedAt = await forecastIssueGeneratedAt(supabase, today);
        if (!await completeForecastIssue(supabase, today, generatedAt)) {
          throw new Error("Forecast issue did not contain every required point and horizon");
        }
        await saveCursor(
          supabase,
          FORECAST_CURSOR_PIPELINE,
          today,
          COMPLETE_CURSOR,
          cursorUpdatedAt,
        );
        await pruneForecastIssues(supabase);
      })());
      forecastErrorMessage = completion.error;
    }
    if (!soilPoints.length && !forecastPoints.length) {
      const cursorError = soilErrorMessage ?? forecastErrorMessage;
      await finishRun(supabase, runId, cursorError ? "partial" : "skipped", {
        errorMessage: cursorError,
        metadata: {
          reason: "Daily soil and forecast refresh completed",
          forecastReconciliation,
        },
      });
      const conditionsRefreshed = soilErrorMessage
        ? false
        : await refreshSpatialLevelConditionsAfterIngestion(supabase, today);
      return json({
        runId,
        refreshed: 0,
        forecasted: 0,
        complete: !cursorError,
        conditionsRefreshed,
        snapshotDate: today,
      });
    }

    const forecastGeneratedAt = forecastPoints.length
      ? await forecastIssueGeneratedAt(supabase, today)
      : new Date().toISOString();
    const [currentSoil, forecastAtmosphere, forecastSoil] = await Promise.all([
      soilPoints.length
        ? settle(fetchSoil(soilPoints))
        : Promise.resolve<Settled<OpenMeteoLocation[]>>({ data: [] }),
      forecastPoints.length
        ? settle(fetchForecast(forecastPoints, "atmosphere"))
        : Promise.resolve<Settled<OpenMeteoLocation[]>>({ data: [] }),
      forecastPoints.length
        ? settle(fetchForecast(forecastPoints, "soil"))
        : Promise.resolve<Settled<OpenMeteoLocation[]>>({ data: [] }),
    ]);
    soilErrorMessage ??= currentSoil.error;
    const atmosphericForecastError = forecastAtmosphere.error;
    const soilForecastError = forecastSoil.error;
    forecastErrorMessage ??= [atmosphericForecastError, soilForecastError]
      .filter((message): message is string => Boolean(message))
      .join("; ") || undefined;

    const observedAt = new Date().toISOString();
    if (forecastPoints.length) {
      await Promise.all([
        recordForecastSourceState(
          supabase,
          "ecmwf-ifs-hres-forecast",
          atmosphericForecastError,
          observedAt,
          "Full-resolution IFS HRES atmospheric forecast fetched at 9 km for the five-day projected suitability trend.",
          runId,
        ),
        recordForecastSourceState(
          supabase,
          "open-meteo-soil-forecast",
          soilForecastError,
          observedAt,
          "Hourly 3–9 cm soil-moisture forecast fetched at 9 km for the five-day projected suitability trend.",
          runId,
        ),
      ]);
    }

    let rows: Array<Record<string, unknown>> = [];
    const currentSoilLocations = currentSoil.data;
    if (currentSoilLocations) {
      try {
        rows = soilPoints.map((point, index) => {
          const location = currentSoilLocations[index];
          const normalized = normalizeOpenMeteo(location, location, "soil");
          return {
            point_id: point.point_id,
            snapshot_date: today,
            observed_at: observedAt,
            sources: ["Open-Meteo soil moisture"],
            source_resolution_m: point.native_resolution_m,
            confidence: normalized.unavailableFields.length ? "limited" : "moderate",
            stale: false,
            unavailable_fields: normalized.unavailableFields,
            values: {
              ...normalized.values,
              soilMoistureResolutionM: 9000,
              soilGridLatitude: finiteNumber(location.latitude),
              soilGridLongitude: finiteNumber(location.longitude),
            },
            run_id: runId,
          };
        });
      } catch (error) {
        soilErrorMessage = error instanceof Error ? error.message : "Unable to normalize current soil data";
        rows = [];
      }
    }

    let forecastRows: Array<Record<string, unknown>> = [];
    const atmosphericForecastLocations = forecastAtmosphere.data;
    const soilForecastLocations = forecastSoil.data;
    if (atmosphericForecastLocations && soilForecastLocations) {
      try {
        forecastRows = forecastPoints.flatMap((point, index) => {
          const atmosphereLocation = atmosphericForecastLocations[index];
          const soilLocation = soilForecastLocations[index];
          const normalized = normalizeOpenMeteoForecast(
            atmosphereLocation,
            soilLocation,
            forecastGeneratedAt,
          );
          const forecasts = normalized.baseline
            ? [normalized.baseline, ...normalized.points]
            : [];
          return forecasts.map((forecast) => ({
            point_id: point.point_id,
            snapshot_date: today,
            generated_at: forecastGeneratedAt,
            valid_at: forecast.validAt,
            horizon_hours: forecast.horizonHours,
            sources: ["ECMWF IFS HRES via Open-Meteo", "Open-Meteo soil-moisture forecast"],
            source_resolution_m: 9000,
            confidence: forecast.unavailableFields.length ? "limited" : "moderate",
            unavailable_fields: forecast.unavailableFields,
            values: {
              ...forecast.values,
              weatherModel: "ECMWF IFS HRES forecast",
              atmosphericResolutionM: 9000,
              soilMoistureResolutionM: 9000,
              weatherGridLatitude: finiteNumber(atmosphereLocation.latitude),
              weatherGridLongitude: finiteNumber(atmosphereLocation.longitude),
              weatherElevationM: finiteNumber(atmosphereLocation.elevation),
              soilGridLatitude: finiteNumber(soilLocation.latitude),
              soilGridLongitude: finiteNumber(soilLocation.longitude),
            },
            run_id: runId,
          }));
        });
        const expectedRows = forecastPoints.length * 6;
        if (forecastRows.length !== expectedRows) {
          forecastErrorMessage = `Forecast normalization returned ${forecastRows.length} of ${expectedRows} expected rows`;
        }
      } catch (error) {
        forecastErrorMessage = error instanceof Error ? error.message : "Unable to normalize forecast data";
        forecastRows = [];
      }
    }

    let storedSoilRows = 0;
    let storedForecastRows = 0;
    await Promise.all([
      (async () => {
        if (!rows.length) return;
        try {
          const { error } = await supabase
            .from("weather_grid_snapshots")
            .upsert(rows, { onConflict: "point_id,snapshot_date" });
          if (error) throw error;
          await saveCursor(
            supabase,
            SOIL_CURSOR_PIPELINE,
            today,
            soilPoints.at(-1)!.point_id,
            observedAt,
          );
          storedSoilRows = rows.length;
        } catch (error) {
          soilErrorMessage = error instanceof Error ? error.message : "Unable to store current soil data";
          console.error("Unable to store current spatial soil batch", {
            runId,
            message: soilErrorMessage,
          });
        }
      })(),
      (async () => {
        if (!forecastRows.length) return;
        try {
          const { error } = await supabase
            .from("weather_grid_forecasts")
            .upsert(forecastRows, { onConflict: "point_id,snapshot_date,horizon_hours" });
          if (error) throw error;
          storedForecastRows = forecastRows.length;
          const completeForecastRows = forecastRows.every((row) =>
            Array.isArray(row.unavailable_fields) && row.unavailable_fields.length === 0
          );
          if (!forecastErrorMessage && completeForecastRows) {
            await saveCursor(
              supabase,
              FORECAST_CURSOR_PIPELINE,
              today,
              forecastPoints.at(-1)!.point_id,
              observedAt,
            );
          }
        } catch (error) {
          forecastErrorMessage = error instanceof Error ? error.message : "Unable to store spatial forecasts";
          console.error("Unable to store spatial forecast batch", {
            runId,
            message: forecastErrorMessage,
          });
        }
      })(),
    ]);

    if (soilErrorMessage) {
      console.error("Current spatial soil stream will retry independently", {
        runId,
        message: soilErrorMessage,
      });
    }
    if (forecastErrorMessage) {
      console.error("Spatial forecast stream will retry independently", {
        runId,
        message: forecastErrorMessage,
      });
    }

    const forecastHasUnavailableFields = forecastRows.some((row) =>
      Array.isArray(row.unavailable_fields) && row.unavailable_fields.length > 0
    );
    const forecastBatchSucceeded = forecastPoints.length > 0 &&
      !forecastErrorMessage && !forecastHasUnavailableFields &&
      storedForecastRows === forecastPoints.length * 6;
    const forecastIncomplete = forecastPoints.length > 0 && !forecastBatchSucceeded;
    const soilComplete = soilAlreadyComplete ||
      (!soilErrorMessage && soilPoints.length < BATCH_SIZE);
    let forecastComplete = forecastAlreadyComplete ||
      (!forecastIncomplete && forecastPoints.length < BATCH_SIZE);
    if (soilComplete && !soilAlreadyComplete) {
      await saveCursor(supabase, SOIL_CURSOR_PIPELINE, today, COMPLETE_CURSOR, observedAt);
    }
    if (forecastComplete && !forecastAlreadyComplete) {
      const completedIssue = await completeForecastIssue(
        supabase,
        today,
        forecastGeneratedAt,
      );
      if (completedIssue) {
        await saveCursor(supabase, FORECAST_CURSOR_PIPELINE, today, COMPLETE_CURSOR, observedAt);
        await pruneForecastIssues(supabase);
      } else {
        forecastErrorMessage = "Forecast issue did not contain every required point and horizon";
        forecastComplete = false;
      }
    }
    await finishRun(
      supabase,
      runId,
      Boolean(soilErrorMessage) || Boolean(forecastErrorMessage) || rows.some((row) =>
        Array.isArray(row.unavailable_fields) && row.unavailable_fields.length > 0
      ) ||
          forecastIncomplete || forecastHasUnavailableFields
        ? "partial"
        : "succeeded",
      {
        rowsRead: soilPoints.length + forecastPoints.length,
        rowsWritten: storedSoilRows + storedForecastRows,
        metadata: {
          firstPointId: soilPoints[0]?.point_id,
          lastPointId: soilPoints.at(-1)?.point_id,
          soilMoistureResolutionM: 9000,
          forecastModel: "ecmwf_ifs_hres",
          forecastResolutionM: 9000,
          firstForecastPointId: forecastPoints[0]?.point_id,
          lastForecastPointId: forecastPoints.at(-1)?.point_id,
          forecastRows: storedForecastRows,
          forecastReconciliation,
          forecastError: forecastErrorMessage,
          atmosphericForecastError,
          soilForecastError,
          soilError: soilErrorMessage,
        },
      },
    );
    const complete = soilComplete && forecastComplete;
    const conditionsRefreshed = soilComplete
      ? await refreshSpatialLevelConditionsAfterIngestion(supabase, today)
      : false;
    return json({
      runId,
      refreshed: storedSoilRows,
      forecasted: storedForecastRows,
      forecastAvailable: forecastPoints.length === 0 || forecastBatchSucceeded,
      forecastRealigned: forecastReconciliation.realigned,
      complete,
      conditionsRefreshed,
      snapshotDate: today,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Spatial soil refresh failed", { runId, message });
    try {
      if (runId) await finishRun(createAdminClient(), runId, "failed", { errorMessage: message });
    } catch (finishError) {
      console.error("Unable to record failed soil refresh", finishError);
    }
    return json({ error: "Spatial soil refresh failed", runId }, 500);
  }
});
