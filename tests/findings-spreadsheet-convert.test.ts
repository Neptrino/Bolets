import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  batchFindings,
  convertFindings,
  DEFAULT_BATCH_SIZE,
} from "@/tests/helpers/findings-spreadsheet";
import { parsePrivateHistoricalFindings } from "@/tests/helpers/historical-finding-replay";

const inputPath = process.env.FINDINGS_CONVERT_INPUT;
const outputDir = process.env.FINDINGS_CONVERT_OUTPUT_DIR;

function writeBatches(
  directory: string,
  prefix: string,
  findings: ReturnType<typeof convertFindings>["events"],
  maxPerBatch: number,
) {
  const batches = batchFindings(findings, maxPerBatch);
  const written: string[] = [];
  batches.forEach((batch, index) => {
    // Every batch must satisfy the same validator the replay tools use, so a
    // conversion bug fails here rather than deep inside a network run.
    parsePrivateHistoricalFindings(JSON.stringify(batch));
    const name = batches.length === 1
      ? `${prefix}.json`
      : `${prefix}.batch-${String(index + 1).padStart(2, "0")}.json`;
    writeFileSync(join(directory, name), `${JSON.stringify(batch, null, 2)}\n`, {
      mode: 0o600,
    });
    written.push(name);
  });
  return written;
}

it.skipIf(!inputPath || !outputDir)(
  "converts a private findings spreadsheet into replay batches without printing coordinates",
  () => {
    const maxPerBatch = Number(process.env.FINDINGS_CONVERT_BATCH_SIZE ?? DEFAULT_BATCH_SIZE);
    const converted = convertFindings(readFileSync(inputPath!, "utf8"));
    if (converted.events.length === 0) {
      throw new Error("The findings spreadsheet produced no replayable events");
    }

    mkdirSync(outputDir!, { recursive: true, mode: 0o700 });
    const eventFiles = writeBatches(outputDir!, "findings", converted.events, maxPerBatch);
    const negativeFiles = converted.observedNegatives.length
      ? writeBatches(
          outputDir!,
          "observed-negatives",
          converted.observedNegatives,
          maxPerBatch,
        )
      : [];
    writeFileSync(
      join(outputDir!, "findings-metadata.json"),
      `${JSON.stringify(converted.metadata, null, 2)}\n`,
      { mode: 0o600 },
    );

    const summary = {
      version: converted.metadata.version,
      rows: converted.metadata.rows,
      events: converted.metadata.events,
      observedNegatives: converted.metadata.observedNegatives,
      skippedRows: converted.metadata.skipped.length,
      skipped: converted.metadata.skipped,
      speciesCounts: converted.metadata.speciesCounts,
      dateRange: converted.metadata.dateRange,
      eventFiles,
      negativeFiles,
    };

    const encodedSummary = JSON.stringify(summary);
    expect(encodedSummary).not.toMatch(/latitude|longitude/i);
    expect(encodedSummary).not.toMatch(/\b-?\d{1,3}\.\d{4,}\b/);

    console.log(JSON.stringify(summary, null, 2));
  },
);
