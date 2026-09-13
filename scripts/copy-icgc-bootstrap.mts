import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ICGC_BOOTSTRAP_KEYS, ICGC_BOOTSTRAP_VERSION, icgcBootstrapAssetPath } from "../src/lib/icgc-bootstrap.ts";

/** Export frozen, verified public tiles without making provider requests during builds. */
export async function copyIcgcBootstrap(root: string) {
  const source = join(root, "data/icgc-bootstrap", ICGC_BOOTSTRAP_VERSION);
  const manifest = JSON.parse(await readFile(join(source, "manifest.json"), "utf8")) as {
    entries: { key: string; sha256: string; bytes: number }[];
  };
  const records = new Map(manifest.entries.map(entry => [entry.key, entry]));
  if (records.size !== ICGC_BOOTSTRAP_KEYS.length || manifest.entries.length !== records.size)
    throw new Error("ICGC bootstrap manifest has unexpected coverage");
  const tiles = await Promise.all(ICGC_BOOTSTRAP_KEYS.map(async key => {
    const entry = records.get(key);
    if (!entry) throw new Error(`Missing ICGC bootstrap tile: ${key}`);
    const bytes = await readFile(join(source, `${key}.webp`));
    if (bytes.length !== entry.bytes || createHash("sha256").update(bytes).digest("hex") !== entry.sha256)
      throw new Error(`ICGC bootstrap checksum mismatch: ${key}`);
    return { bytes, destination: join(root, "public", icgcBootstrapAssetPath(key)!.slice(1)) };
  }));
  for (const tile of tiles) {
    await mkdir(dirname(tile.destination), { recursive: true });
    await writeFile(tile.destination, tile.bytes);
  }
  return { files: tiles.length, bytes: tiles.reduce((total, tile) => total + tile.bytes.length, 0) };
}
