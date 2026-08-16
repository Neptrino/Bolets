import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { speciesProfiles } from "@/data/species";
import {
  DEFAULT_MAX_UNCERTAINTY_M,
  EVENT_SOURCES,
  type EventSourceId,
  extractionSidecar,
  GBIF_OCCURRENCE_ENDPOINT,
  type GbifRecord,
  groupEventsToFindings,
  CATALONIA_BOUNDS,
  MINIMUM_EVENT_DATE,
  type RejectionReason,
  usableEventRecord,
  type UsableEvent,
} from "@/tests/helpers/gbif-event-extraction";
import {
  batchFindings,
  DEFAULT_BATCH_SIZE,
} from "@/tests/helpers/findings-spreadsheet";
import { parsePrivateHistoricalFindings } from "@/tests/helpers/historical-finding-replay";

const outputDir = process.env.FUNGACAT_EVENTS_OUTPUT_DIR;
const countOnly = process.env.FUNGACAT_EVENTS_COUNT_ONLY === "1";
const PAGE_SIZE = 300;
const PAGE_DELAY_MS = 100;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchPage(url: URL, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "Bolets-Atles/1.0" } });
    if (response.ok) {
      return await response.json() as { results?: GbifRecord[]; endOfRecords?: boolean };
    }
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === attempts) {
      throw new Error(`GBIF occurrence search returned ${response.status}`);
    }
    await wait(attempt * 1500);
  }
  throw new Error("GBIF occurrence search failed");
}

it.skipIf(!outputDir && !countOnly)(
  "extracts dated occurrences usable as private validation events",
  async () => {
    const maxUncertaintyM = Number(
      process.env.FUNGACAT_EVENTS_MAX_UNCERTAINTY_M ?? DEFAULT_MAX_UNCERTAINTY_M,
    );
    const today = new Date().toISOString().slice(0, 10);
    const sourceId = (process.env.FUNGACAT_EVENTS_SOURCE ?? "fungacat") as EventSourceId;
    const source = EVENT_SOURCES[sourceId];
    if (!source) throw new Error(`Unknown occurrence source "${sourceId}"`);
    const supported = speciesProfiles.filter(
      (profile) => profile.predictionMode === "current",
    );

    const entries: { speciesId: string; event: UsableEvent }[] = [];
    const perSpecies: { speciesId: string; scanned: number; usable: number }[] = [];
    const rejections: Record<string, number> = {};

    for (const profile of supported) {
      let offset = 0;
      let scanned = 0;
      let usable = 0;
      for (;;) {
        const url = new URL(GBIF_OCCURRENCE_ENDPOINT);
        if (source.datasetKey) url.searchParams.set("datasetKey", source.datasetKey);
        url.searchParams.set("scientificName", profile.identity.scientificName);
        url.searchParams.set("hasCoordinate", "true");
        url.searchParams.set("occurrenceStatus", "PRESENT");
        if (!source.datasetKey) {
          // Without a dataset filter the search is global, so restrict it to
          // the same Catalonia envelope the record filter enforces.
          url.searchParams.set("decimalLatitude", `${CATALONIA_BOUNDS.south},${CATALONIA_BOUNDS.north}`);
          url.searchParams.set("decimalLongitude", `${CATALONIA_BOUNDS.west},${CATALONIA_BOUNDS.east}`);
        }
        // Bounding the date server-side keeps the scan small: the AROME archive
        // cannot replay anything earlier anyway.
        url.searchParams.set("eventDate", `${MINIMUM_EVENT_DATE},${today}`);
        url.searchParams.set("limit", String(PAGE_SIZE));
        url.searchParams.set("offset", String(offset));

        const page = await fetchPage(url);
        const results = page.results ?? [];
        scanned += results.length;
        for (const record of results) {
          const outcome = usableEventRecord(record, { maxUncertaintyM, today });
          if ("event" in outcome) {
            entries.push({ speciesId: profile.speciesId, event: outcome.event });
            usable += 1;
          } else {
            const reason: RejectionReason = outcome.rejected;
            rejections[reason] = (rejections[reason] ?? 0) + 1;
          }
        }
        if (page.endOfRecords || results.length === 0) break;
        offset += PAGE_SIZE;
        await wait(PAGE_DELAY_MS);
      }
      perSpecies.push({ speciesId: profile.speciesId, scanned, usable });
    }

    const { findings, recordKeys } = groupEventsToFindings(entries);
    const summary = {
      source: source.label,
      speciesQueried: supported.length,
      recordsScanned: perSpecies.reduce((total, entry) => total + entry.scanned, 0),
      usableRecords: entries.length,
      locations: findings.length,
      rejections,
      perSpecies: perSpecies.filter((entry) => entry.scanned > 0),
      maxUncertaintyM,
    };

    const encoded = JSON.stringify(summary);
    expect(encoded).not.toMatch(/latitude|longitude/i);
    console.log(JSON.stringify(summary, null, 2));

    if (countOnly || !outputDir) return;

    mkdirSync(outputDir, { recursive: true, mode: 0o700 });
    const batches = batchFindings(findings, DEFAULT_BATCH_SIZE);
    batches.forEach((batch, index) => {
      parsePrivateHistoricalFindings(JSON.stringify(batch));
      writeFileSync(
        join(outputDir, `${source.id}-findings.batch-${String(index + 1).padStart(2, "0")}.json`),
        `${JSON.stringify(batch, null, 2)}\n`,
        { mode: 0o600 },
      );
    });
    writeFileSync(
      join(outputDir, `${source.id}-extraction-metadata.json`),
      `${JSON.stringify(
        extractionSidecar({
          source,
          accessedAt: new Date().toISOString(),
          maxUncertaintyM,
          perSpecies,
          findings,
          recordKeys,
        }),
        null,
        2,
      )}\n`,
      { mode: 0o600 },
    );
  },
  900_000,
);
