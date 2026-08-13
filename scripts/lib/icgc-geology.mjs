import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, rename, stat, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { join, resolve } from "node:path";

const execFileAsync = promisify(execFile);

export const ICGC_GEOLOGY_SOURCE = Object.freeze({
  dataset: "Mapa geològic de Catalunya 1:50.000",
  sourceVersion: "v3r0-202412",
  scaleDenominator: 50_000,
  crs: "EPSG:25831",
  layer: "_04_unitats_geologiques_50000",
  license: "CC BY 4.0",
  url: "https://datacloud.icgc.cat/datacloud/geologia-territorial-50000-geologic/gpkg/geologia-territorial-50000-geologic-v3r0-202412.zip",
  zipName: "geologia-territorial-50000-geologic-v3r0-202412.zip",
  zipBytes: 161_846_224,
  gpkgName: "geologia-territorial-50000-geologic-v3r0-202412.gpkg",
  gpkgSha256: "60d730395874ee860d09ddddbf2cc60d187c46f05f9018e7049bcdf8a65b684f",
});

export const GEOLOGY_CLASSES = Object.freeze([
  "silicic",
  "calcareous",
  "mixed",
  "unconsolidated",
]);

const CLASS_LANE_SHIFT = Object.freeze({
  silicic: 0,
  calcareous: 7,
  mixed: 14,
  unconsolidated: 21,
});
const LANE_MASK = 0x7f;

function normalizedLithology(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[·'’]/g, ".")
    .toLocaleLowerCase("ca")
    .replace(/\s+/g, " ")
    .trim();
}

// These rules are intentionally conservative and are used only by the mapping
// generator. The production builder consumes the exhaustive reviewed JSON map;
// it never classifies new or changed ICGC descriptions at runtime.
const UNCONSOLIDATED_PATTERNS = [
  /\bdiposit/, /\bterrass/, /\bllit actual\b/, /\bllera\b/, /al\.luv/, /col\.luv/,
  /\bglacial/, /\bglaciar/, /\bmorren/, /\btarter/, /\besbaldregall/, /\bpediment/,
  /\bventall al/, /\bcon de dejeccio/, /\bduna/, /\bplatja/, /\bmaresm/, /\bdeltaic/,
  /\brebliment/, /\breblert/, /\bllacustr/, /\bpalustr/, /\bfluvio/, /\balbufer/,
];

const LOOSE_QUATERNARY_PATTERNS = [
  /\bgrave/, /\bsorr/, /\bllim/, /\bargil/, /\bcodol/, /\bbloc/, /\bclast/, /\bbretx/,
  /\blapil/, /\bpiroclast/, /\bcendra/, /\btorba/, /\bloess/,
];

const CALCAREOUS_PATTERNS = [
  /\bcalcari/, /\bcalcaren/, /\bcalcilut/, /\bcalcodolomit/, /\bdolomi/, /\bcarbonat/,
  /\bmarg(?:a|ue)/, /\bmargo/, /\btraverti/, /\bmarbre/, /\bcarniol/, /\bcalitx/, /\bcalcosquist/,
];

const SILICIC_PATTERNS = [
  /\bgranit/, /\bgranodiorit/, /\bleucogranit/, /\btonalit/, /\bpegmatit/, /\baplita/,
  /\bgneis/,
  /\besquist/, /\bmicaesquist/, /\bpissarr/, /\bfil\.lit/, /\bquars/, /\bquarzit/,
  /\blidit/, /\bchert/, /\bradiolarit/, /\briol/, /\bdacit/, /\bignimbrit/, /\barcos/,
  /\bmetagrauv/, /\bmetagres/,
];

export function classifyGeologicalUnit(description, period = "") {
  const normalized = normalizedLithology(description);
  if (!normalized) return "unknown";
  const normalizedPeriod = normalizedLithology(period);
  const quaternary = normalizedPeriod.includes("quaternari");
  if (quaternary && [...UNCONSOLIDATED_PATTERNS, ...LOOSE_QUATERNARY_PATTERNS].some((pattern) => pattern.test(normalized))) {
    return "unconsolidated";
  }
  const calcareous = CALCAREOUS_PATTERNS.some((pattern) => pattern.test(normalized));
  const silicic = SILICIC_PATTERNS.some((pattern) => pattern.test(normalized));
  if (calcareous && silicic) return "mixed";
  if (calcareous) return "calcareous";
  if (silicic) return "silicic";
  return "unknown";
}

export function descriptionFingerprint(description) {
  return `sha256:${createHash("sha256").update(String(description)).digest("hex")}`;
}

export function mappingFingerprint(units) {
  const canonical = units
    .map(({ unitId, code, description, substrateClass, descriptionFingerprint: fingerprint, sourceVersion }) =>
      [unitId, code, description, substrateClass, fingerprint, sourceVersion].join("\u0000"))
    .join("\n");
  return `sha256:${createHash("sha256").update(canonical).digest("hex")}`;
}

export function packGeologyCoverages(coverages) {
  let packed = 0;
  let sum = 0;
  for (const substrateClass of GEOLOGY_CLASSES) {
    const coverage = Number(coverages?.[substrateClass] ?? 0);
    if (!Number.isInteger(coverage) || coverage < 0 || coverage > 100) {
      throw new Error(`Invalid ${substrateClass} geology coverage: ${coverage}`);
    }
    sum += coverage;
    packed = (packed | (coverage << CLASS_LANE_SHIFT[substrateClass])) >>> 0;
  }
  if (sum > 100) throw new Error(`Geology class coverages exceed 100%: ${sum}%`);
  return packed;
}

export function packGeologySampleCounts(sampleCounts, totalSamples = 25) {
  if (!Number.isInteger(totalSamples) || totalSamples < 1) throw new Error(`Invalid geology sample total: ${totalSamples}`);
  const percentages = Object.fromEntries(GEOLOGY_CLASSES.map((substrateClass) => [
    substrateClass,
    Number(sampleCounts?.[substrateClass] ?? 0) > 0
      ? Math.max(1, Math.round(Number(sampleCounts?.[substrateClass] ?? 0) * 100 / totalSamples))
      : 0,
  ]));
  const classifiedSamples = GEOLOGY_CLASSES.reduce(
    (total, substrateClass) => total + Number(sampleCounts?.[substrateClass] ?? 0),
    0,
  );
  const targetTotal = classifiedSamples > 0
    ? Math.max(1, Math.round(classifiedSamples * 100 / totalSamples))
    : 0;
  let difference = targetTotal - GEOLOGY_CLASSES.reduce((total, substrateClass) => total + percentages[substrateClass], 0);
  if (difference) {
    const ranked = [...GEOLOGY_CLASSES].sort((left, right) => {
      const exactLeft = Number(sampleCounts?.[left] ?? 0) * 100 / totalSamples;
      const exactRight = Number(sampleCounts?.[right] ?? 0) * 100 / totalSamples;
      const remainderLeft = exactLeft - Math.floor(exactLeft);
      const remainderRight = exactRight - Math.floor(exactRight);
      return difference > 0 ? remainderRight - remainderLeft : remainderLeft - remainderRight;
    });
    for (let index = 0; difference && index < ranked.length; index += 1) {
      const substrateClass = ranked[index];
      if (difference > 0) {
        percentages[substrateClass] += 1;
        difference -= 1;
      } else if (percentages[substrateClass] > (Number(sampleCounts?.[substrateClass] ?? 0) > 0 ? 1 : 0)) {
        percentages[substrateClass] -= 1;
        difference += 1;
      }
    }
  }
  return { coverages: percentages, packed: packGeologyCoverages(percentages) };
}

export function unpackGeologyCoverages(packed) {
  const value = Number(packed);
  if (!Number.isInteger(value) || value < 0 || value > 0x0fffffff) throw new Error(`Invalid packed geology coverages: ${packed}`);
  return Object.fromEntries(GEOLOGY_CLASSES.map((substrateClass) => [
    substrateClass,
    (value >>> CLASS_LANE_SHIFT[substrateClass]) & LANE_MASK,
  ]));
}

export function summarizeGeologySamples(unitIds, unitsById, totalSamples = 25) {
  if (!Array.isArray(unitIds) || !Number.isInteger(totalSamples) || totalSamples < 1) {
    throw new Error("Geology samples and a positive integer sample total are required");
  }
  const countsByClass = Object.fromEntries(GEOLOGY_CLASSES.map((value) => [value, 0]));
  const countsByUnit = new Map();
  let mappedSamples = 0;
  for (const rawUnitId of unitIds) {
    if (rawUnitId === undefined || rawUnitId === null) continue;
    const unitId = Number(rawUnitId);
    const unit = unitsById.get(unitId);
    if (!unit) throw new Error(`Sample references unmapped ICGC unit ${unitId}`);
    mappedSamples += 1;
    countsByUnit.set(unitId, (countsByUnit.get(unitId) ?? 0) + 1);
    if (GEOLOGY_CLASSES.includes(unit.substrateClass)) countsByClass[unit.substrateClass] += 1;
  }
  // The compact database representation uses whole percentages. Preserve any
  // real positive mapped sliver as the minimum representable 1% rather than
  // rounding it to false absence.
  const toPercent = (count) => count > 0 ? Math.max(1, Math.round(count * 100 / totalSamples)) : 0;
  const { coverages, packed: coveragesPacked } = packGeologySampleCounts(countsByClass, totalSamples);
  const mappedCoveragePercent = toPercent(mappedSamples);
  const dominantUnit = [...countsByUnit.entries()].sort((left, right) => right[1] - left[1] || left[0] - right[0])[0];
  return {
    coverages,
    coveragesPacked,
    mappedCoveragePercent,
    ...(dominantUnit ? {
      dominantUnitId: dominantUnit[0],
      dominantUnitCoveragePercent: toPercent(dominantUnit[1]),
    } : {}),
  };
}

async function sha256File(path) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(path), hash);
  return hash.digest("hex");
}

async function downloadFile(url, destination) {
  const temporary = `${destination}.part-${process.pid}`;
  const response = await fetch(url, { headers: { "User-Agent": "Bolets-Atles-Geology-Builder/1.0" } });
  if (!response.ok || !response.body) throw new Error(`Unable to download ${url}: ${response.status} ${response.statusText}`);
  await pipeline(Readable.fromWeb(response.body), (await import("node:fs")).createWriteStream(temporary));
  await rename(temporary, destination);
}

export async function ensureIcgcGeologyPackage(cacheDirectory) {
  const directory = resolve(cacheDirectory);
  await mkdir(directory, { recursive: true });
  const zipPath = join(directory, ICGC_GEOLOGY_SOURCE.zipName);
  let zipValid = false;
  try {
    zipValid = (await stat(zipPath)).size === ICGC_GEOLOGY_SOURCE.zipBytes;
  } catch {}
  if (!zipValid) {
    try { await unlink(zipPath); } catch {}
    await downloadFile(ICGC_GEOLOGY_SOURCE.url, zipPath);
  }
  const zipSize = (await stat(zipPath)).size;
  if (zipSize !== ICGC_GEOLOGY_SOURCE.zipBytes) throw new Error(`Unexpected ICGC ZIP size: ${zipSize}`);

  const gpkgPath = join(directory, ICGC_GEOLOGY_SOURCE.gpkgName);
  let packageValid = false;
  try {
    packageValid = await sha256File(gpkgPath) === ICGC_GEOLOGY_SOURCE.gpkgSha256;
  } catch {}
  if (!packageValid) {
    try { await unlink(gpkgPath); } catch {}
    await execFileAsync("unzip", ["-n", zipPath, ICGC_GEOLOGY_SOURCE.gpkgName, "-d", directory]);
  }
  const digest = await sha256File(gpkgPath);
  if (digest !== ICGC_GEOLOGY_SOURCE.gpkgSha256) throw new Error(`Unexpected ICGC GeoPackage SHA-256: ${digest}`);
  return gpkgPath;
}

export async function readOfficialGeologyUnits(gpkgPath) {
  await access(gpkgPath);
  const table = ICGC_GEOLOGY_SOURCE.layer;
  const sql = `select Codi as code, min(Descripcio) as description, min(Periode) as period, count(distinct Descripcio) as description_count from ${table} group by Codi order by Codi collate binary`;
  const { stdout } = await execFileAsync("sqlite3", ["-readonly", "-json", gpkgPath, sql], { maxBuffer: 4 * 1024 * 1024 });
  const rows = JSON.parse(stdout || "[]");
  if (rows.length !== 1055) throw new Error(`Expected 1055 ICGC geology codes, received ${rows.length}`);
  const ambiguous = rows.filter((row) => Number(row.description_count) !== 1);
  if (ambiguous.length) throw new Error(`ICGC codes have non-unique descriptions: ${ambiguous.map((row) => row.code).join(", ")}`);
  return rows.map((row) => ({ code: String(row.code), description: String(row.description).trim(), period: String(row.period ?? "").trim() }));
}

export async function loadGeologyMapping(path) {
  const artifact = JSON.parse(await readFile(path, "utf8"));
  if (artifact?.source?.sourceVersion !== ICGC_GEOLOGY_SOURCE.sourceVersion || !Array.isArray(artifact.units)) {
    throw new Error(`Invalid geology mapping artifact ${path}`);
  }
  const ids = new Set();
  const codes = new Set();
  for (const unit of artifact.units) {
    if (!Number.isInteger(unit.unitId) || unit.unitId < 1 || unit.unitId > 32767 || ids.has(unit.unitId)) throw new Error(`Invalid or duplicate geology unit ID ${unit.unitId}`);
    if (!unit.code || codes.has(unit.code)) throw new Error(`Invalid or duplicate geology code ${unit.code}`);
    if (![...GEOLOGY_CLASSES, "unknown"].includes(unit.substrateClass)) throw new Error(`Invalid geology class for ${unit.code}`);
    if (unit.descriptionFingerprint !== descriptionFingerprint(unit.description)) throw new Error(`Description fingerprint mismatch for ${unit.code}`);
    ids.add(unit.unitId);
    codes.add(unit.code);
  }
  if (artifact.units.length !== 1055 || artifact.audit?.mappingFingerprint !== mappingFingerprint(artifact.units)) {
    throw new Error(`Geology mapping completeness/fingerprint mismatch in ${path}`);
  }
  return artifact;
}

export function parseGeoPackagePolygon(hex) {
  const bytes = Buffer.from(hex, "hex");
  if (bytes.length < 13 || bytes.toString("ascii", 0, 2) !== "GP") throw new Error("Invalid GeoPackage geometry header");
  const flags = bytes[3];
  if (flags & 0x10) return [];
  const envelopeIndicator = (flags >> 1) & 0x07;
  const envelopeDoubles = [0, 4, 6, 6, 8][envelopeIndicator];
  if (envelopeDoubles === undefined) throw new Error(`Unsupported GeoPackage envelope ${envelopeIndicator}`);
  let offset = 8 + envelopeDoubles * 8;

  function parseGeometry() {
    const littleEndian = bytes[offset] === 1;
    offset += 1;
    const rawType = bytes.readUInt32LE(offset);
    const typeValue = littleEndian ? rawType : bytes.readUInt32BE(offset);
    offset += 4;
    const ewkbZ = Boolean(typeValue & 0x80000000);
    const ewkbM = Boolean(typeValue & 0x40000000);
    const ewkbSrid = Boolean(typeValue & 0x20000000);
    const isoType = typeValue & 0x1fffffff;
    const baseType = isoType % 1000;
    const dimensions = 2 + (ewkbZ || Math.floor(isoType / 1000) === 1 || Math.floor(isoType / 1000) === 3 ? 1 : 0) +
      (ewkbM || Math.floor(isoType / 1000) === 2 || Math.floor(isoType / 1000) === 3 ? 1 : 0);
    const readUint = () => {
      const value = littleEndian ? bytes.readUInt32LE(offset) : bytes.readUInt32BE(offset);
      offset += 4;
      return value;
    };
    const readDouble = () => {
      const value = littleEndian ? bytes.readDoubleLE(offset) : bytes.readDoubleBE(offset);
      offset += 8;
      return value;
    };
    if (ewkbSrid) readUint();
    if (baseType === 3) {
      const rings = [];
      const ringCount = readUint();
      for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
        const points = [];
        const pointCount = readUint();
        for (let pointIndex = 0; pointIndex < pointCount; pointIndex += 1) {
          const point = [readDouble(), readDouble()];
          for (let dimension = 2; dimension < dimensions; dimension += 1) readDouble();
          points.push(point);
        }
        rings.push(points);
      }
      return [rings];
    }
    if (baseType === 6) {
      const polygons = [];
      const polygonCount = readUint();
      for (let polygonIndex = 0; polygonIndex < polygonCount; polygonIndex += 1) polygons.push(...parseGeometry());
      return polygons;
    }
    throw new Error(`Unsupported WKB geometry type ${typeValue}`);
  }

  return parseGeometry();
}

function pointOnSegment(x, y, left, right) {
  const cross = (x - left[0]) * (right[1] - left[1]) - (y - left[1]) * (right[0] - left[0]);
  if (Math.abs(cross) > 1e-8) return false;
  return x >= Math.min(left[0], right[0]) && x <= Math.max(left[0], right[0]) &&
    y >= Math.min(left[1], right[1]) && y <= Math.max(left[1], right[1]);
}

function pointInRing(x, y, ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const left = ring[previous];
    const right = ring[index];
    if (pointOnSegment(x, y, left, right)) return true;
    if ((right[1] > y) !== (left[1] > y) && x < (left[0] - right[0]) * (y - right[1]) / (left[1] - right[1]) + right[0]) inside = !inside;
  }
  return inside;
}

export function polygonContainsPoint(polygons, x, y) {
  return polygons.some((rings) => rings.length > 0 && pointInRing(x, y, rings[0]) && !rings.slice(1).some((ring) => pointInRing(x, y, ring)));
}
