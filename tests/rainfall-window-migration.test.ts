import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260813150000_add_24h_rainfall_window.sql",
  ),
  "utf8",
);

describe("24-hour rainfall migration", () => {
  it("injects executable SQL with a real newline instead of a literal escape", () => {
    expect(migration).toContain("$replacement$'rainfall24hMm'");
    expect(migration).toContain(
      "$needle$'rainfall3dMm', avg(nullif(latest.values ->> 'rainfall3dMm', '')::double precision)$needle$",
    );
    expect(migration).not.toContain("$needle$'rainfall3dMm'$needle$");
    expect(migration).not.toContain("\\n        'rainfall3dMm'");
  });
});
