import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const packagePath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(await readFile(packagePath, "utf8"));
const destination = join("public", "maplibre", version);
await mkdir(destination, { recursive: true });
// Next's bundler cannot preserve the worker's relative shared-module import.
// Keep both upstream files together and tie their immutable URLs to the package.
for (const file of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) {
  await copyFile(join(dirname(packagePath), "dist", file), join(destination, file));
}
await copyFile(join(dirname(packagePath), "LICENSE.txt"), join(destination, "LICENSE.txt"));
console.log(`Prepared MapLibre ${version} worker modules`);
