import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = join(process.cwd(), "scripts", "convert-findings-spreadsheet.mjs");

function run(...args: string[]) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

describe("private findings conversion CLI", () => {
  it("documents external paths and the observed-negative rule", () => {
    const result = run("--help");
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--input=/absolute/path/findings.csv");
    expect(result.stdout).toContain("--output-dir=/absolute/path/diagnostics");
    expect(result.stdout).toContain("outside the repository");
    expect(result.stdout).toContain("abundance 0");
  });

  it("requires both an input file and an output directory", () => {
    const result = run("--input=/tmp/findings.csv");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Both --input and --output-dir are required");
  });

  it("rejects an input path inside the repository", () => {
    const result = run(
      `--input=${join(process.cwd(), "findings.csv")}`,
      "--output-dir=/tmp/bolets-diagnostics",
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--input must stay outside the repository");
  });

  it("rejects an output directory inside the repository", () => {
    const result = run(
      "--input=/tmp/findings.csv",
      `--output-dir=${join(process.cwd(), "diagnostics")}`,
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--output-dir must stay outside the repository");
  });

  it("rejects a relative input path", () => {
    const result = run("--input=findings.csv", "--output-dir=/tmp/bolets-diagnostics");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--input must be an absolute path outside the repository");
  });

  it("rejects a non-positive batch size", () => {
    const result = run(
      "--input=/tmp/findings.csv",
      "--output-dir=/tmp/bolets-diagnostics",
      "--batch-size=0",
    );
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("--batch-size must be a positive integer");
  });
});
