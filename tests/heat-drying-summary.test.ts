import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

it("collapses species alternatives and resamples repeated outings as one cell", () => {
  const root = mkdtempSync(join(tmpdir(), "bolets-heat-drying-"));
  try {
    const inputs = [1, 2].map((location) => ({ record: { location }, centre: { latitude: 42, longitude: 2 } }));
    const encoded = inputs.map((r) => JSON.stringify(r)).join("\n");
    const inputsPath = join(root, "inputs.jsonl");
    writeFileSync(inputsPath, encoded);
    writeFileSync(join(root, "summary.json"), JSON.stringify({
      candidates: [{ name: "baseline" }, { name: "identical" }],
      inputsSha256: createHash("sha256").update(encoded).digest("hex"),
    }));
    const records = [1, 2].flatMap((location) => ["event", "control"].flatMap((kind) =>
      [20, 80].map((score, index) => ({ location, kind, date: `2026-08-0${location}`,
        speciesId: `species-${index}`, offsetDaysFromFinding: 0,
        fruitingConditionsScore: kind === "event" ? score : 40,
        opportunityIndex: kind === "event" ? score : 40,
      }))));
    for (const name of ["baseline", "identical"]) {
      mkdirSync(join(root, name));
      writeFileSync(join(root, name, "evaluation-records.jsonl"), records.map((r) => JSON.stringify(r)).join("\n"));
    }
    const result = spawnSync(process.execPath, ["scripts/summarize-heat-drying.mjs",
      `--input=${root}`, `--thermal-inputs=${inputsPath}`], { encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    const report = JSON.parse(readFileSync(join(root, "comparison.json"), "utf8"));
    expect(report.methodology.bootstrapCellCount).toBe(1);
    expect(report.variants[0].expanded.events).toBe(4);
    expect(report.variants[0].collapsed.events).toBe(2);
    expect(report.variants[0].collapsed.fruitingConditionsScore.positiveMean).toBe(80);
    expect(report.variants[0].collapsed.fruitingConditionsScore.aucBackground).toBe(1);
    expect(report.variants[1].pairedAucDelta95.fruitingConditionsScore).toEqual([0, 0]);
    expect(readFileSync(join(root, "finding-scores.csv"), "utf8")).toContain("2026-08-01");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
