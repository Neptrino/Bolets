import { mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";
import sharp from "sharp";
import {
  STATIC_MEDIA_VERSION,
  STATIC_MEDIA_WIDTHS,
  staticMediaVariantPath,
} from "../src/lib/static-media.ts";

const publicDirectory = join(process.cwd(), "public");
const mediaDirectory = join(publicDirectory, "media");
const outputDirectory = join(mediaDirectory, "optimized");
const sourceDirectories = [
  join(mediaDirectory, "boletus-edulis"),
  join(mediaDirectory, "generated"),
  join(mediaDirectory, "wikimedia"),
];

async function webpFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return webpFiles(path);
    return entry.isFile() && entry.name.endsWith(".webp") ? [path] : [];
  }));

  return nested.flat();
}

await rm(outputDirectory, { recursive: true, force: true });

const sourceFiles = (await Promise.all(sourceDirectories.map(webpFiles))).flat();
const jobs = sourceFiles.flatMap((sourcePath) => {
  const relativePath = relative(mediaDirectory, sourcePath).split(sep).join("/");
  const publicPath = `/media/${relativePath}`;

  return STATIC_MEDIA_WIDTHS.map((width) => ({
    destinationPath: join(publicDirectory, staticMediaVariantPath(publicPath, width).slice(1)),
    sourcePath,
    width,
  }));
});

let nextJob = 0;
async function work() {
  while (nextJob < jobs.length) {
    const job = jobs[nextJob++];
    if (!job) return;

    await mkdir(dirname(job.destinationPath), { recursive: true });
    await sharp(job.sourcePath)
      .resize({ width: job.width, withoutEnlargement: true })
      .webp({ quality: 72, effort: 4 })
      .toFile(job.destinationPath);
  }
}

await Promise.all(Array.from({ length: 8 }, work));
console.log(`Generated ${jobs.length} responsive ${STATIC_MEDIA_VERSION} media variants from ${sourceFiles.length} sources.`);
