import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  type EvaluationRecord,
  renderSummaryTable,
  summarizeEvaluation,
} from "@/tests/helpers/finding-evaluation-report";

const artifactsDir = process.env.FINDING_EVAL_METRICS_ARTIFACTS;

it.skipIf(!artifactsDir)(
  "summarises saved replay artifacts into a deterministic diagnostic report",
  () => {
    const files = readdirSync(artifactsDir!).filter((name) => name.endsWith(".jsonl"));
    if (files.length === 0) {
      throw new Error("No .jsonl replay artifacts were found in the artifacts directory");
    }

    const records: EvaluationRecord[] = [];
    for (const file of files) {
      for (const line of readFileSync(join(artifactsDir!, file), "utf8").split("\n")) {
        if (line.trim()) records.push(JSON.parse(line) as EvaluationRecord);
      }
    }
    if (records.length === 0) throw new Error("Replay artifacts contained no records");

    // Only the day of the finding itself counts as the positive; the flanking
    // offsets are kept in the artifacts for trajectory inspection.
    const scored = records.filter(
      (record) =>
        record.kind !== "event" ||
        (record as { offsetDaysFromFinding?: number | null }).offsetDaysFromFinding === 0,
    );

    const report = summarizeEvaluation(scored, {
      artifactFiles: files.sort(),
      sourceRecords: records.length,
      scoredRecords: scored.length,
    });

    const reportOut = process.env.FINDING_EVAL_REPORT_OUT;
    if (reportOut) {
      writeFileSync(reportOut, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    }

    const encoded = JSON.stringify(report);
    expect(encoded).not.toMatch(/latitude|longitude|cellId/i);
    // Recomputing from the same artifacts must give the same report.
    expect(JSON.stringify(summarizeEvaluation(scored, {
      artifactFiles: files.sort(),
      sourceRecords: records.length,
      scoredRecords: scored.length,
    }))).toBe(encoded);

    console.log(JSON.stringify(report, null, 2));
    console.error(renderSummaryTable(report));
  },
  120_000,
);
