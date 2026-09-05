import { cp, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error("An export destination is required");
  await exportStaticAssets(process.cwd(), resolve(process.argv[2]));
}
