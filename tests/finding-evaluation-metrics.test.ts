import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import {
  type EvaluationRecord,
} from "@/tests/helpers/finding-evaluation-report";
import { attachObservationInputs, renderObservationSummary, summarizeObservationEvaluation } from "@/tests/helpers/finding-observation-report";
import { parsePrivateEvaluationFindings } from "@/tests/helpers/historical-finding-replay";

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

    // Legacy artifacts need the original taxonomic grouping, never a guess
    // based on a flat list of scored candidates. Scores remain immutable.
    const input = process.env.FINDING_EVAL_METRICS_INPUT;
    const inputFiles = input ? statSync(input).isDirectory()
      ? readdirSync(input).filter((name) => name.endsWith(".json") && !name.includes("metadata"))
          .map((name) => join(input, name))
      : [input] : [];
    const enriched = input ? attachObservationInputs(records, inputFiles.flatMap((file) =>
      parsePrivateEvaluationFindings(readFileSync(file, "utf8")))) : records;

    const report = summarizeObservationEvaluation(enriched, {
      artifactFiles: files.sort(),
    });

    const reportOut = process.env.FINDING_EVAL_REPORT_OUT;
    if (reportOut) {
      writeFileSync(reportOut, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
    }

    const encoded = JSON.stringify(report);
    expect(encoded).not.toMatch(/latitude|longitude|cellId/i);
    // Recomputing from the same artifacts must give the same report.
    expect(JSON.stringify(summarizeObservationEvaluation(enriched, {
      artifactFiles: files.sort(),
    }))).toBe(encoded);

    console.log(JSON.stringify(report, null, 2));
    console.error(renderObservationSummary(report));
  },
  120_000,
);
