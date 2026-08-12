import { createAdminClient, finishRun, json, startRun, verifyIngestionRequest } from "../_shared/pipeline.ts";

type OccurrenceDataset = {
  dataset_key: string;
  source_id: string;
  license_url: string;
};

type OccurrenceTaxon = {
  dataset_key: string;
  species_id: string;
  scientific_name: string;
  last_record_count: number;
};

type GbifRecord = {
  key?: number;
  decimalLongitude?: number;
  decimalLatitude?: number;
  eventDate?: string;
  year?: number;
  month?: number;
  day?: number;
  basisOfRecord?: string;
  coordinateUncertaintyInMeters?: number;
  issues?: string[];
};

type GbifPage = {
  count?: number;
  endOfRecords?: boolean;
  results?: GbifRecord[];
};

type NormalizedOccurrence = {
  gbif_id: number;
  longitude: number;
  latitude: number;
  event_date: string | null;
  event_year: number | null;
  event_month: number | null;
  basis_of_record: string;
  coordinate_uncertainty_m: number | null;
  license_url: string;
};

const PAGE_SIZE = 300;
const MAX_SEARCH_RECORDS = 100_000;
const DEFAULT_SPECIES_BATCH_SIZE = 7;
const MAX_SPECIES_BATCH_SIZE = 14;
const CATALONIA_BOUNDS = { west: 0.05, south: 40.48, east: 3.32, north: 42.92 };
const FATAL_GBIF_ISSUES = new Set([
  "ZERO_COORDINATE",
  "COORDINATE_INVALID",
  "COUNTRY_COORDINATE_MISMATCH",
  "TAXON_MATCH_NONE",
  "TAXON_MATCH_HIGHERRANK",
  "TAXON_MATCH_FUZZY"
]);

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchJsonWithRetry(url: URL, attempts = 4): Promise<GbifPage> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "Bolets-Atles/1.0 (historical occurrence sync)" }
      });
      if (response.ok) return await response.json() as GbifPage;
      if (response.status !== 429 && response.status < 500) {
        throw new Error(`GBIF occurrence search returned ${response.status}`);
      }
      const retryAfter = Number(response.headers.get("retry-after"));
      const delayMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 30_000)
        : Math.min(1_000 * 2 ** attempt, 10_000);
      lastError = new Error(`GBIF occurrence search returned ${response.status}`);
      await wait(delayMs);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("GBIF request failed");
      if (attempt < attempts - 1) await wait(Math.min(1_000 * 2 ** attempt, 10_000));
    }
  }
  throw lastError ?? new Error("GBIF request failed");
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function normalizedDate(record: GbifRecord) {
  const datePrefix = record.eventDate?.split("/")[0]?.slice(0, 10);
  if (datePrefix && validDate(datePrefix)) return datePrefix;
  if (!Number.isInteger(record.year) || !Number.isInteger(record.month) || !Number.isInteger(record.day)) return null;
  const candidate = `${record.year}-${String(record.month).padStart(2, "0")}-${String(record.day).padStart(2, "0")}`;
  return validDate(candidate) ? candidate : null;
}

function normalizeRecord(record: GbifRecord, licenseUrl: string): NormalizedOccurrence | null {
  const longitude = record.decimalLongitude;
  const latitude = record.decimalLatitude;
  if (!Number.isInteger(record.key) || record.key! <= 0 || !Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  if (longitude! < CATALONIA_BOUNDS.west || longitude! > CATALONIA_BOUNDS.east) return null;
  if (latitude! < CATALONIA_BOUNDS.south || latitude! > CATALONIA_BOUNDS.north) return null;
  if ((record.issues ?? []).some((issue) => FATAL_GBIF_ISSUES.has(issue))) return null;

  const uncertainty = Number.isFinite(record.coordinateUncertaintyInMeters)
    ? Math.round(record.coordinateUncertaintyInMeters!)
    : null;
  if (uncertainty !== null && (uncertainty < 0 || uncertainty > 10_000)) return null;

  const eventYear = Number.isInteger(record.year) && record.year! >= 1500 && record.year! <= 2100 ? record.year! : null;
  const eventMonth = Number.isInteger(record.month) && record.month! >= 1 && record.month! <= 12 ? record.month! : null;

  return {
    gbif_id: record.key!,
    longitude: longitude!,
    latitude: latitude!,
    event_date: normalizedDate(record),
    event_year: eventYear,
    event_month: eventMonth,
    basis_of_record: record.basisOfRecord?.trim() || "UNKNOWN",
    coordinate_uncertainty_m: uncertainty,
    license_url: licenseUrl
  };
}

async function syncTaxon(
  supabase: ReturnType<typeof createAdminClient>,
  dataset: OccurrenceDataset,
  taxon: OccurrenceTaxon,
  trigger: "cron" | "manual"
) {
  const snapshotDate = new Date().toISOString().slice(0, 10);
  const runId = await startRun(supabase, "species-occurrences", trigger, snapshotDate, {
    provider: "GBIF",
    datasetKey: dataset.dataset_key,
    speciesId: taxon.species_id,
    scientificName: taxon.scientific_name,
    minimumGridSizeM: 10_000
  });
  let rowsRead = 0;
  let rowsWritten = 0;
  let filteredRecords = 0;

  await supabase.from("occurrence_taxa").update({
    last_attempted_at: new Date().toISOString(),
    last_run_id: runId,
    error_message: null,
    updated_at: new Date().toISOString()
  }).eq("dataset_key", dataset.dataset_key).eq("species_id", taxon.species_id);

  try {
    let offset = 0;
    let expectedCount: number | undefined;
    while (true) {
      const url = new URL("https://api.gbif.org/v1/occurrence/search");
      url.searchParams.set("datasetKey", dataset.dataset_key);
      url.searchParams.set("scientificName", taxon.scientific_name);
      url.searchParams.set("hasCoordinate", "true");
      url.searchParams.set("occurrenceStatus", "PRESENT");
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(offset));

      const page = await fetchJsonWithRetry(url);
      const records = Array.isArray(page.results) ? page.results : [];
      expectedCount ??= Number.isFinite(page.count) ? page.count : undefined;
      if (expectedCount !== undefined && expectedCount > MAX_SEARCH_RECORDS) {
        throw new Error(`GBIF query contains ${expectedCount} records; use a reviewed download snapshot instead`);
      }

      rowsRead += records.length;
      const normalized = records
        .map((record) => normalizeRecord(record, dataset.license_url))
        .filter((record): record is NormalizedOccurrence => record !== null);
      filteredRecords += records.length - normalized.length;

      if (normalized.length) {
        const { data, error } = await supabase.rpc("upsert_species_occurrence_batch", {
          p_dataset_key: dataset.dataset_key,
          p_species_id: taxon.species_id,
          p_run_id: runId,
          p_records: normalized
        });
        if (error) throw error;
        rowsWritten += Number(data ?? 0);
      }

      offset += records.length;
      if (page.endOfRecords === true || records.length < PAGE_SIZE || records.length === 0 || (expectedCount !== undefined && offset >= expectedCount)) break;
      if (offset + PAGE_SIZE > MAX_SEARCH_RECORDS) throw new Error("GBIF search pagination limit reached");
      await wait(100);
    }

    const suspiciousDrop = taxon.last_record_count >= 10 && rowsWritten < taxon.last_record_count * 0.5;
    if (suspiciousDrop) {
      const message = `Refresh retained ${rowsWritten} of ${taxon.last_record_count} expected records; previous snapshot preserved`;
      await supabase.from("occurrence_taxa").update({ error_message: message, updated_at: new Date().toISOString() })
        .eq("dataset_key", dataset.dataset_key).eq("species_id", taxon.species_id);
      await finishRun(supabase, runId, "partial", {
        rowsRead,
        rowsWritten,
        errorMessage: message,
        metadata: { filteredRecords, previousRecordCount: taxon.last_record_count, snapshotPreserved: true }
      });
      return { speciesId: taxon.species_id, status: "partial", rowsRead, rowsWritten, message };
    }

    const { data: finalized, error: finalizeError } = await supabase.rpc("finalize_species_occurrence_sync", {
      p_dataset_key: dataset.dataset_key,
      p_species_id: taxon.species_id,
      p_run_id: runId
    });
    if (finalizeError) throw finalizeError;
    const result = Array.isArray(finalized) ? finalized[0] : finalized;
    const currentRecords = Number(result?.current_records ?? rowsWritten);
    const deletedRecords = Number(result?.deleted_records ?? 0);

    await finishRun(supabase, runId, "succeeded", {
      rowsRead,
      rowsWritten: currentRecords,
      metadata: { filteredRecords, deletedRecords, previousRecordCount: taxon.last_record_count }
    });
    return { speciesId: taxon.species_id, status: "succeeded", rowsRead, rowsWritten: currentRecords, filteredRecords };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown occurrence synchronization error";
    await supabase.from("occurrence_taxa").update({ error_message: message, updated_at: new Date().toISOString() })
      .eq("dataset_key", dataset.dataset_key).eq("species_id", taxon.species_id);
    await finishRun(supabase, runId, "failed", { rowsRead, rowsWritten, errorMessage: message, metadata: { filteredRecords } });
    return { speciesId: taxon.species_id, status: "failed", rowsRead, rowsWritten, message };
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "POST" });

  const supabase = createAdminClient();
  if (!await verifyIngestionRequest(request, supabase)) return json({ error: "Unauthorized ingestion request" }, 401);

  const body = await request.json().catch(() => ({})) as { trigger?: "cron" | "manual"; force?: boolean; maxSpecies?: number };
  const trigger = body.trigger === "manual" ? "manual" : "cron";
  const requestedMax = Number.isInteger(body.maxSpecies) ? body.maxSpecies! : DEFAULT_SPECIES_BATCH_SIZE;
  const maxSpecies = Math.min(Math.max(requestedMax, 1), MAX_SPECIES_BATCH_SIZE);
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const { data: datasetRows, error: datasetError } = await supabase.from("occurrence_datasets")
      .select("dataset_key,source_id,license_url").eq("enabled", true);
    if (datasetError) throw datasetError;
    const datasets = (datasetRows ?? []) as OccurrenceDataset[];
    const datasetByKey = new Map(datasets.map((dataset) => [dataset.dataset_key, dataset]));
    if (!datasets.length) return json({ refreshed: 0, results: [], detail: "No occurrence datasets are enabled" });

    let query = supabase.from("occurrence_taxa")
      .select("dataset_key,species_id,scientific_name,last_record_count")
      .eq("enabled", true)
      .in("dataset_key", [...datasetByKey.keys()])
      .order("last_attempted_at", { ascending: true, nullsFirst: true })
      .order("last_synced_at", { ascending: true, nullsFirst: true })
      .order("species_id", { ascending: true })
      .limit(maxSpecies);
    if (!body.force) query = query.or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`);
    const { data: taxonRows, error: taxonError } = await query;
    if (taxonError) throw taxonError;

    const results = [];
    for (const taxon of (taxonRows ?? []) as OccurrenceTaxon[]) {
      const dataset = datasetByKey.get(taxon.dataset_key);
      if (!dataset) continue;
      results.push(await syncTaxon(supabase, dataset, taxon, trigger));
    }

    const failed = results.filter((result) => result.status !== "succeeded");
    const now = new Date().toISOString();
    for (const dataset of datasets) {
      const sourceResults = results.filter((result) => {
        const taxon = (taxonRows ?? []).find((row) => row.species_id === result.speciesId);
        return taxon?.dataset_key === dataset.dataset_key;
      });
      if (!sourceResults.length) continue;
      const sourceFailed = sourceResults.filter((result) => result.status !== "succeeded");
      await supabase.from("pipeline_sources").update({
        status: sourceFailed.length ? "degraded" : "active",
        status_detail: sourceFailed.length
          ? `${sourceFailed.length} of ${sourceResults.length} taxon refreshes need review; prior snapshots were preserved.`
          : `${sourceResults.length} taxon snapshots refreshed from GBIF and generalized to 10 km.`,
        checked_at: now,
        updated_at: now
      }).eq("source_id", dataset.source_id);
    }

    return json({ refreshed: results.length - failed.length, failed: failed.length, results }, failed.length ? 207 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown occurrence refresh error";
    console.error("Historical occurrence refresh failed", message);
    return json({ error: "Historical occurrence refresh failed" }, 500);
  }
});
