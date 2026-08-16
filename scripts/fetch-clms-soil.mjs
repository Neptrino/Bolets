import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { signS3GetRequest } from "./lib/aws-sigv4.mjs";
import {
  CDSE_S3_HOST,
  CDSE_S3_REGION,
  discoverClmsSnapshot,
} from "./lib/clms-cdse.mjs";

const args = new Map(
  process.argv.slice(2).filter((argument) => argument.startsWith("--")).map((argument) => {
    const [key, ...value] = argument.slice(2).split("=");
    return [key, value.length ? value.join("=") : "true"];
  }),
);
const snapshotDate = args.get("date");
const discoverOnly = args.has("discover-only");
const outputArgument = args.get("output-dir");

if (!discoverOnly && !outputArgument) {
  throw new Error(
    "Usage: npm run soil:fetch-clms -- --output-dir=/absolute/path/outside-the-repository [--date=YYYY-MM-DD] [--discover-only]",
  );
}
if (outputArgument && !isAbsolute(outputArgument)) throw new Error("--output-dir must be an absolute path");

const outputDirectory = outputArgument ? resolve(outputArgument) : undefined;
if (outputDirectory) {
  const relativeToRepository = relative(process.cwd(), outputDirectory);
  if (relativeToRepository === "" || (!relativeToRepository.startsWith("..") && !isAbsolute(relativeToRepository))) {
    throw new Error("CLMS raster staging must remain outside the repository");
  }
}

async function digestFile(path, algorithm) {
  const hash = createHash(algorithm);
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

async function downloadAsset(asset, credentials) {
  const targetPath = join(outputDirectory, asset.filename);
  try {
    const existing = await stat(targetPath);
    if (!existing.isFile() || existing.size !== asset.expectedBytes ||
        await digestFile(targetPath, asset.checksumAlgorithm) !== asset.checksumDigest) {
      throw new Error(`${asset.key} already exists but does not match its immutable CDSE checksum`);
    }
    return { key: asset.key, filename: asset.filename, bytes: existing.size, reused: true };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const headers = signS3GetRequest({
    accessKey: credentials.accessKey,
    secretKey: credentials.secretKey,
    host: CDSE_S3_HOST,
    path: asset.objectPath,
    region: CDSE_S3_REGION,
    extraHeaders: { accept: "image/tiff, application/octet-stream" },
  });
  const response = await fetch(`https://${CDSE_S3_HOST}${asset.objectPath}`, { headers });
  if (!response.ok || !response.body) {
    throw new Error(`${asset.key} download failed with HTTP ${response.status}`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength !== asset.expectedBytes) {
    throw new Error(`${asset.key} download length does not match its STAC provenance`);
  }

  const temporaryPath = `${targetPath}.part-${process.pid}`;
  const hash = createHash(asset.checksumAlgorithm);
  let bytes = 0;
  const verifier = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });
  try {
    await pipeline(
      Readable.fromWeb(response.body),
      verifier,
      createWriteStream(temporaryPath, { flags: "wx" }),
    );
    if (bytes !== asset.expectedBytes || hash.digest("hex") !== asset.checksumDigest) {
      throw new Error(`${asset.key} failed CDSE size or checksum verification`);
    }
    await rename(temporaryPath, targetPath);
  } catch (error) {
    await unlink(temporaryPath).catch((cleanupError) => {
      if (cleanupError?.code !== "ENOENT") throw cleanupError;
    });
    throw error;
  }
  return { key: asset.key, filename: asset.filename, bytes, reused: false };
}

async function downloadWithBoundedConcurrency(downloads, credentials, concurrency = 2) {
  const queue = [...downloads];
  const results = [];
  async function worker() {
    while (queue.length) {
      const asset = queue.shift();
      results.push(await downloadAsset(asset, credentials));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => worker()));
  return results.sort((left, right) => left.key.localeCompare(right.key));
}

async function writeManifest(path, manifest) {
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  try {
    const existing = await readFile(path, "utf8");
    if (existing !== serialized) throw new Error("A different CLMS manifest already exists in the staging directory");
    return false;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await writeFile(path, serialized, { encoding: "utf8", flag: "wx", mode: 0o600 });
  return true;
}

const snapshot = await discoverClmsSnapshot({ snapshotDate });
if (discoverOnly) {
  console.log(JSON.stringify({
    validCataloguePair: true,
    snapshotDate: snapshot.manifest.snapshotDate,
    ssmProductId: snapshot.manifest.ssm.productId,
    swiProductId: snapshot.manifest.swi.productId,
    assets: snapshot.downloads.map(({ key, filename, expectedBytes }) => ({ key, filename, expectedBytes })),
    diagnostics: snapshot.diagnostics,
  }, null, 2));
  process.exit(0);
}

const credentials = {
  accessKey: process.env.CDSE_S3_ACCESS_KEY,
  secretKey: process.env.CDSE_S3_SECRET_KEY,
};
if (!credentials.accessKey || !credentials.secretKey) {
  throw new Error(
    "CDSE_S3_ACCESS_KEY and CDSE_S3_SECRET_KEY are required for authenticated raster downloads. " +
      "Generate them at https://eodata-s3keysmanager.dataspace.copernicus.eu/ — OAuth client credentials " +
      "are not accepted by the CDSE download service.",
  );
}

await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
const downloaded = await downloadWithBoundedConcurrency(snapshot.downloads, credentials);
const manifestPath = join(outputDirectory, "clms-manifest.json");
const manifestWritten = await writeManifest(manifestPath, snapshot.manifest);

console.log(JSON.stringify({
  snapshotDate: snapshot.manifest.snapshotDate,
  assetsVerified: downloaded.length,
  bytesVerified: downloaded.reduce((sum, asset) => sum + asset.bytes, 0),
  assetsReused: downloaded.filter((asset) => asset.reused).length,
  manifestPath,
  manifestWritten,
  sourceGrid: snapshot.diagnostics.sourceGrid,
  scoringEnabled: false,
}, null, 2));
