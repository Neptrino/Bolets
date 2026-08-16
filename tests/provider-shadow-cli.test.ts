import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const script = join(process.cwd(), "scripts", "compare-provider-shadows.mjs");

describe("private provider-shadow CLI", () => {
  it("documents the loopback default and explicit remote opt-in", () => {
    const result = spawnSync(process.execPath, [script, "--help"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--app-url=http://localhost:3101");
    expect(result.stdout).toContain("--allow-remote");
  });

  it("rejects a remote origin before running a comparison unless explicitly allowed", () => {
    const result = spawnSync(process.execPath, [
      script,
      '--points-json=[{"latitude":41,"longitude":1}]',
      "--app-url=https://bolets.app",
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Remote comparison origins require explicit --allow-remote opt-in");
  });
});
