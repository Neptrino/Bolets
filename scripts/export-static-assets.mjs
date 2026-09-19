import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { brotliCompressSync, constants } from "node:zlib";

// Text assets get a Brotli sidecar that Caddy serves as-is; images and fonts
// are already compressed and are left alone.
const SIDECAR_EXTENSIONS = new Set([".js", ".mjs", ".css", ".svg", ".json", ".txt", ".xml"]);
const SIDECAR_MINIMUM_BYTES = 1024;

/** Export only built public assets, never app source, environment or caches. */
export async function exportStaticAssets(source, destination) {
  const mappings = [
    ["public/media/optimized", "media/optimized"],
    [".next/static", "_next/static"],
    ["public/icons", "icons"],
  ];
  for (const [from, to] of mappings) {
    await mkdir(join(destination, to), { recursive: true });
    await cp(join(source, from), join(destination, to), { recursive: true });
    await writeBrotliSidecars(join(destination, to));
  }
}

/** Write `<file>.br` next to every compressible file under `root` that shrinks. */
export async function writeBrotliSidecars(root) {
  for (const path of await listFiles(root)) {
    if (!SIDECAR_EXTENSIONS.has(extname(path)) || path.endsWith(".br")) continue;
    const contents = await readFile(path);
    if (contents.length < SIDECAR_MINIMUM_BYTES) continue;
    const compressed = brotliCompressSync(contents, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
        [constants.BROTLI_PARAM_SIZE_HINT]: contents.length,
      },
    });
    if (compressed.length < contents.length) await writeFile(`${path}.br`, compressed);
  }
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error("An export destination is required");
  await exportStaticAssets(process.cwd(), resolve(process.argv[2]));
}
