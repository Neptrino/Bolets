import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, expect, it } from "vitest";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture(memory = "150") {
  const dir = mkdtempSync(join(tmpdir(), "bolets-function-sync-")); dirs.push(dir);
  const app = join(dir, "app"), supabase = join(dir, "supabase");
  const router = join(supabase, "volumes/functions/main/index.ts");
  mkdirSync(join(app, "supabase/functions/read-spatial-environment"), { recursive: true });
  mkdirSync(join(supabase, "volumes/functions/main"), { recursive: true });
  writeFileSync(join(app, "supabase/functions/read-spatial-environment/index.ts"), "// reader\n");
  writeFileSync(router, `// retained upstream router
  const service_name = path_parts[1]
  const memoryLimitMb = ${memory}
  const workerTimeoutMs = 1 * 60 * 1000
  const worker = await EdgeRuntime.userWorkers.create({
      memoryLimitMb,
      workerTimeoutMs,
  })
`);
  const run = () => spawnSync("sh", [resolve("deploy/vps/sync-functions.sh"), app, supabase], { encoding: "utf8" });
  return { run, router, supabase };
}

it("raises only spatial-reader memory, preserves the router and is idempotent", () => {
  const { run, router, supabase } = fixture();
  expect(run().status).toBe(0);
  const first = readFileSync(router, "utf8");
  const expression = first.match(/const memoryLimitMb = (.+)/)![1];
  const memoryFor = new Function("service_name", `return ${expression}`);
  expect(memoryFor("read-spatial-environment")).toBe(512);
  expect(memoryFor("ingest-weather")).toBe(150);
  expect(memoryFor("other-function")).toBe(150);
  expect(first).toContain("// retained upstream router");
  expect(first).toContain("const workerTimeoutMs = 150 * 1000");
  expect(first).toContain("cpuTimeHardLimitMs,");
  expect(readFileSync(join(supabase, "volumes/functions/read-spatial-environment/index.ts"), "utf8")).toBe("// reader\n");
  expect(run().status).toBe(0);
  expect(readFileSync(router, "utf8")).toBe(first);
});

it("fails closed if an upstream release changes the memory tuning point", () => {
  const { run, router } = fixture("256");
  const before = readFileSync(router, "utf8");
  const result = run();
  expect(result.status).toBe(65);
  expect(result.stderr).toContain("Review the upstream Edge Runtime memory limit");
  expect(readFileSync(router, "utf8")).toBe(before);
});
