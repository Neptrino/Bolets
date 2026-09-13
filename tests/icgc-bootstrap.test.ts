import { afterEach, describe, expect, it } from "vitest";
import { cp, mkdtemp, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { copyIcgcBootstrap } from "../scripts/copy-icgc-bootstrap.mts";
import { ICGC_BOOTSTRAP_KEYS, ICGC_BOOTSTRAP_VERSION, icgcBootstrapAssetPath, icgcBootstrapTileUrl } from "../src/lib/icgc-bootstrap";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "bolets-bootstrap-"));
  roots.push(root);
  const source = join(root, "data/icgc-bootstrap", ICGC_BOOTSTRAP_VERSION);
  await cp(join(process.cwd(), "data/icgc-bootstrap", ICGC_BOOTSTRAP_VERSION), source, { recursive: true });
  return { root, source };
}

describe("frozen opening cartography", () => {
  it("rewrites only the complete allowlisted opening-view tiles", () => {
    expect(ICGC_BOOTSTRAP_KEYS).toHaveLength(18);
    expect(new Set(ICGC_BOOTSTRAP_KEYS).size).toBe(18);
    for (const key of ICGC_BOOTSTRAP_KEYS)
      expect(icgcBootstrapTileUrl(`/api/map-tiles/icgc/v2/${key}`)).toBe(icgcBootstrapAssetPath(key));
    for (const path of ["relief/8/64/47", "relief/7/66/47", "references/7/64/49", "unknown/7/64/47", "relief/7/64/47?style=x", "relief/7/64/47/"])
      expect(icgcBootstrapTileUrl(`/api/map-tiles/icgc/v2/${path}`)).toBeUndefined();
    for (const prefix of ["https://example.com/api/map-tiles/icgc/v2/", "/api/map-tiles/icgc/", "/media/"])
      expect(icgcBootstrapTileUrl(`${prefix}relief/7/64/47`)).toBeUndefined();
  });
  it("exports the verified source bytes without re-encoding", async () => {
    const { root, source } = await fixture();
    expect(await copyIcgcBootstrap(root)).toEqual({ files: 18, bytes: 62920 });
    for (const key of ICGC_BOOTSTRAP_KEYS) {
      const original = await readFile(join(source, `${key}.webp`));
      expect(await readFile(join(root, "public", icgcBootstrapAssetPath(key)!.slice(1)))).toEqual(original);
      expect(await sharp(original).metadata()).toMatchObject({ format: "webp", width: 256, height: 256 });
    }
  });
  it.each(["checksum", "missing", "duplicate"])("rejects %s corruption before exporting any tile", async corruption => {
    const { root, source } = await fixture();
    const path = join(source, "manifest.json");
    const manifest = JSON.parse(await readFile(path, "utf8"));
    if (corruption === "checksum") manifest.entries.at(-1).sha256 = "0".repeat(64);
    if (corruption === "missing") manifest.entries.pop();
    if (corruption === "duplicate") manifest.entries.push(manifest.entries[0]);
    await writeFile(path, JSON.stringify(manifest));
    await expect(copyIcgcBootstrap(root)).rejects.toThrow(/ICGC bootstrap/);
    await expect(access(join(root, "public"))).rejects.toThrow();
  });
});
