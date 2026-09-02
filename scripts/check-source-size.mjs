import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { spawnSync } from "node:child_process";

const REVIEW_THRESHOLD = 500;
const HARD_LIMIT = 1000;
const sourceExtensions = new Set([
  ".cjs",
  ".css",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".scss",
  ".ts",
  ".tsx",
]);

// These are version-controlled catalogues rather than executable modules.
// Splitting either would weaken the catalogue's single source of truth.
const hardLimitExceptions = new Set([
  "data/species-gallery-media.ts",
  "data/species.ts",
]);

// Files above the review threshold may remain only after their boundaries
// have been considered. Keep the reason beside the exception so additions do
// not turn this into an unexplained allowlist.
const reviewedRuntimeFiles = new Map([
  ["app/admin/(private)/operacions/page.tsx", "one private operational status composition"],
  ["app/metode/page.tsx", "one ordered technical-method document"],
  ["app/zones/ceps/page.tsx", "one editorial territorial dossier"],
  ["components/condition-comparison.tsx", "orchestrates extracted reading data and score presentation"],
  ["components/region-map.tsx", "orchestrates map lifecycle, bucket loading and canvas drawing"],
  ["scripts/lib/arome-point-artifacts.mjs", "one offline AROME artefact comparison pipeline"],
  ["scripts/lib/clms-cdse.mjs", "one CDSE request and archive adapter"],
  ["src/lib/prediction-summaries.ts", "regional and area summaries share the same aggregation invariants"],
  ["supabase/functions/_shared/arome-direct.ts", "one provider protocol and GRIB decoding adapter"],
  ["supabase/functions/read-spatial-environment/index.ts", "one response contract across spatial read modes"],
  ["supabase/functions/refresh-spatial-environment/index.ts", "one leased atmospheric publication workflow"],
  ["supabase/functions/refresh-spatial-soil/index.ts", "one leased soil publication workflow"],
]);

const listed = spawnSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
);
if (listed.status !== 0) {
  process.stderr.write(listed.stderr || "Could not list repository files.\n");
  process.exit(listed.status ?? 1);
}

const automaticallyReviewed = (file) =>
  file.startsWith("data/") ||
  file.startsWith("tests/") ||
  file.startsWith("supabase/migrations/") ||
  file === "src/lib/types.ts" ||
  extname(file) === ".css";
const ignored = (file) =>
  file.endsWith("worker-configuration.d.ts") ||
  file.includes("/dist/");
const lineCount = (source) => {
  if (!source) return 0;
  const newlines = source.match(/\r\n|\r|\n/g)?.length ?? 0;
  return newlines + (/\r$|\n$/.test(source) ? 0 : 1);
};

const failures = [];
for (const file of listed.stdout.split("\0").filter(Boolean)) {
  if (!existsSync(file) || !sourceExtensions.has(extname(file)) || ignored(file)) continue;
  const lines = lineCount(readFileSync(file, "utf8"));
  if (lines > HARD_LIMIT && !hardLimitExceptions.has(file)) {
    failures.push(`${file}: ${lines} lines exceeds the ${HARD_LIMIT}-line limit`);
    continue;
  }
  if (
    lines > REVIEW_THRESHOLD &&
    !automaticallyReviewed(file) &&
    !reviewedRuntimeFiles.has(file)
  ) {
    failures.push(
      `${file}: ${lines} lines requires review; split it or record why it remains cohesive`,
    );
  }
}

if (failures.length) {
  process.stderr.write(`Source-size check failed:\n${failures.map((item) => `- ${item}`).join("\n")}\n`);
  process.exit(1);
}
