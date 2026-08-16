import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20260815160509_add_arome_shadow_staging.sql"),
  "utf8",
);
const config = fs.readFileSync(path.join(root, "supabase/config.toml"), "utf8");
const edgeFunction = fs.readFileSync(
  path.join(root, "supabase/functions/stage-arome-shadow/index.ts"),
  "utf8",
);
const pipeline = fs.readFileSync(
  path.join(root, "supabase/functions/_shared/pipeline.ts"),
  "utf8",
);

describe("direct AROME staging isolation", () => {
  it("creates a bounded private GRIB-only Storage bucket", () => {
    expect(migration).toMatch(/insert into storage\.buckets[\s\S]*'environment-shadow'[\s\S]*false[\s\S]*8388608[\s\S]*application\/wmo-grib/);
    expect(migration).not.toMatch(/create policy[\s\S]*environment-shadow/i);
    expect(config).toMatch(/\[storage\.buckets\.environment-shadow\][\s\S]*public = false[\s\S]*file_size_limit = "8MiB"[\s\S]*application\/wmo-grib/);
  });

  it("keeps gateway JWT verification and uses a least-privilege named token", () => {
    expect(config).toMatch(/\[functions\.stage-arome-shadow\]\s+verify_jwt = true/);
    expect(edgeFunction).toContain("verifyNamedToken(");
    expect(edgeFunction).toContain('"x-arome-shadow-stage-token"');
    expect(edgeFunction).toContain('"arome-shadow-stage"');
    expect(edgeFunction).not.toContain("requireServiceRole");
    expect(edgeFunction).toContain('Deno.env.get("METEOFRANCE_AROME_API_KEY")');
  });

  it("audits a distinct shadow pipeline without writing production scoring inputs", () => {
    expect(migration).toContain("'spatial-atmosphere-shadow'");
    expect(migration).toContain("'meteofrance-arome-direct-shadow'");
    expect(edgeFunction).toContain('startRun(supabase, "spatial-atmosphere-shadow"');
    expect(edgeFunction).toContain("scoringEnabled: false");
    expect(edgeFunction).not.toMatch(/weather_grid_snapshots|cell_environment_snapshots|prediction_cells|hydrothermal/i);
    expect(migration).not.toMatch(/weather_grid_snapshots|cell_environment_snapshots|prediction_cells|hydrothermal/i);
  });

  it("keeps one-field outcomes blocked and labels semantic verification pending", () => {
    expect(edgeFunction).not.toMatch(/updateSourceState\([\s\S]{0,120}"active"/);
    expect(edgeFunction).toContain('"blocked"');
    expect(edgeFunction).toContain('semanticVerification: "pending"');
    expect(edgeFunction).toContain('semantic_verification: "pending"');
    expect(edgeFunction).toContain("if (!sourceBlocked)");
    expect(migration).toMatch(/true,\s*'blocked'/);
  });

  it("does not return success when audit finalization fails after upload", () => {
    expect(pipeline).toMatch(/if \(error\) \{[\s\S]*return false;[\s\S]*return true;/);
    expect(edgeFunction).toContain("const auditFinalized = await finishRun");
    expect(edgeFunction).toContain("if (!auditFinalized)");
    expect(edgeFunction).toContain("object is private and recoverable, but audit finalization failed");
  });

  it("never creates a public or signed object URL", () => {
    expect(edgeFunction).toContain("AROME_SHADOW_BUCKET");
    expect(edgeFunction).not.toMatch(/getPublicUrl|createSignedUrl|signedUrl/);
    expect(edgeFunction).toContain("upsert: false");
  });
});
