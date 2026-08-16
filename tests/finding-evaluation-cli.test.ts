import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { planSpans } from "@/tests/finding-evaluation-replay.live.test";

const script = join(process.cwd(), "scripts", "evaluate-findings.mjs");

function run(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

describe("evaluation CLI", () => {
  it("documents both phases and the external-path rule", () => {
    const result = run("--help");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--replay");
    expect(result.stdout).toContain("--metrics");
    expect(result.stdout).toContain("outside the repository");
    expect(result.stdout).toContain("--allow-remote");
  });

  it("requires an artifacts directory", () => {
    const result = run("--metrics");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--artifacts-dir is required");
  });

  it("rejects an artifacts directory inside the repository", () => {
    const result = run("--metrics", `--artifacts-dir=${join(process.cwd(), "artifacts")}`);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--artifacts-dir must stay outside the repository");
  });

  it("rejects a remote origin without an explicit opt-in", () => {
    const result = run(
      "--replay",
      "--input=/tmp/bolets-findings.json",
      "--artifacts-dir=/tmp/bolets-artifacts",
      "--app-url=https://bolets.example",
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Remote comparison origins require explicit --allow-remote opt-in",
    );
  });

  it("rejects a non-numeric control count", () => {
    const result = run(
      "--replay",
      "--input=/tmp/bolets-findings.json",
      "--artifacts-dir=/tmp/bolets-artifacts",
      "--controls=many",
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--controls must be a non-negative integer");
  });
});

describe("provider request planning", () => {
  it("covers nearby targets with one padded span", () => {
    const spans = planSpans(["2025-10-12", "2025-10-20", "2025-10-25"]);
    expect(spans).toHaveLength(1);
    // 38 days of lead-in before the earliest target.
    expect(spans[0]).toEqual({ startDate: "2025-09-04", endDate: "2025-10-25" });
  });

  it("splits targets that cannot share a 92-day request", () => {
    const spans = planSpans(["2025-01-15", "2025-10-12"]);
    expect(spans).toHaveLength(2);
    for (const span of spans) {
      const days = (Date.parse(`${span.endDate}T00:00:00Z`) -
        Date.parse(`${span.startDate}T00:00:00Z`)) / 86_400_000 + 1;
      expect(days).toBeLessThanOrEqual(92);
    }
  });

  it("deduplicates repeated target dates", () => {
    expect(planSpans(["2025-10-12", "2025-10-12"])).toEqual(
      planSpans(["2025-10-12"]),
    );
  });
});
