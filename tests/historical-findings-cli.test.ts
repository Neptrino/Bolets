import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = join(process.cwd(), "scripts", "compare-historical-findings.mjs");

describe("private historical-findings CLI", () => {
  it("documents external private input and the loopback default", () => {
    const result = spawnSync(process.execPath, [script, "--help"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--points-file=/absolute/path/findings.json");
    expect(result.stdout).toContain("--app-url=http://localhost:3101");
    expect(result.stdout).toContain("never emit");
  });

  it("rejects a remote origin before private bounds leave the device", () => {
    const result = spawnSync(process.execPath, [
      script,
      '--points-json=[{"observedAt":"2025-09-13T12:00:00+02:00","latitude":41,"longitude":2,"speciesIds":["boletus-edulis"]}]',
      "--app-url=https://bolets.example",
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(
      "Remote comparison origins require explicit --allow-remote opt-in",
    );
  });
});
