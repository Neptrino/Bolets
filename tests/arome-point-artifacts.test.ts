import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fromArrayBuffer, writeArrayBuffer } from "geotiff";
import { afterEach, describe, expect, it } from "vitest";

import {
  AROME_POINT_ARTIFACT_SCHEMA,
  compareAromePointArtifacts,
  parseAromePointArtifactManifest,
  parsePrivateAromePoints,
  sanitizeAromePointDiagnosticError,
} from "@/scripts/lib/arome-point-artifacts.mjs";

const VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "wind_speed_10m",
] as const;
type Variable = (typeof VARIABLES)[number];

const PREFIXES: Record<Variable, string> = {
  temperature_2m: "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
  relative_humidity_2m: "RELATIVE_HUMIDITY__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
  wind_speed_10m: "WIND_SPEED__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
};
const UNITS: Record<Variable, string> = {
  temperature_2m: "K",
  relative_humidity_2m: "%",
  wind_speed_10m: "m s-1",
};
const TIFF_UNITS: Record<Variable, string> = {
  temperature_2m: "C",
  relative_humidity_2m: "%",
  wind_speed_10m: "m/s",
};
const TIFF_ELEMENTS: Record<Variable, string> = {
  temperature_2m: "TMP",
  relative_humidity_2m: "RH",
  wind_speed_10m: "WIND",
};
const RUN_TOKEN = "2026-08-15T03.00.00Z";
const RUN_AT = "2026-08-15T03:00:00.000Z";
const VALID_AT = "2026-08-15T04:00:00.000Z";

function coverageId(variable: Variable) {
  return `${PREFIXES[variable]}___${RUN_TOKEN}`;
}

function capabilitiesFixture() {
  return `<?xml version="1.0"?>
    <wcs:Capabilities xmlns:wcs="http://www.opengis.net/wcs/2.0">
      <wcs:Contents>${VARIABLES.map((variable) => `
        <wcs:CoverageSummary><wcs:CoverageId>${coverageId(variable)}</wcs:CoverageId></wcs:CoverageSummary>
      `).join("")}</wcs:Contents>
    </wcs:Capabilities>`;
}

function describeFixture(variable: Variable) {
  const level = variable === "wind_speed_10m" ? 10 : 2;
  return `<?xml version="1.0"?>
    <wcs:CoverageDescriptions
      xmlns:wcs="http://www.opengis.net/wcs/2.0"
      xmlns:gml="http://www.opengis.net/gml/3.2"
      xmlns:gmlrgrid="http://www.opengis.net/gml/3.3/rgrid"
      xmlns:gmlcov="http://www.opengis.net/gmlcov/1.0"
      xmlns:swe="http://www.opengis.net/swe/2.0">
      <wcs:CoverageDescription>
        <gml:boundedBy>
          <gml:EnvelopeWithTimePeriod axisLabels="long lat height time" uomLabels="deg deg m ISO8601">
            <gml:lowerCorner>-5 40 ${level}</gml:lowerCorner>
            <gml:upperCorner>10 50 ${level}</gml:upperCorner>
            <gml:beginPosition>2026-08-15T03:00:00Z</gml:beginPosition>
            <gml:endPosition>2026-08-15T05:00:00Z</gml:endPosition>
          </gml:EnvelopeWithTimePeriod>
        </gml:boundedBy>
        <wcs:CoverageId>${coverageId(variable)}</wcs:CoverageId>
        <gml:domainSet>
          <gmlrgrid:ReferenceableGridByVectors dimension="4">
            <gml:axisLabels>long lat height time</gml:axisLabels>
            <gmlrgrid:generalGridAxis><gmlrgrid:GeneralGridAxis>
              <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">0.01 0 0 0</gmlrgrid:offsetVector>
              <gmlrgrid:coefficients/><gmlrgrid:gridAxesSpanned>long</gmlrgrid:gridAxesSpanned>
            </gmlrgrid:GeneralGridAxis></gmlrgrid:generalGridAxis>
            <gmlrgrid:generalGridAxis><gmlrgrid:GeneralGridAxis>
              <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">0 -0.01 0 0</gmlrgrid:offsetVector>
              <gmlrgrid:coefficients/><gmlrgrid:gridAxesSpanned>lat</gmlrgrid:gridAxesSpanned>
            </gmlrgrid:GeneralGridAxis></gmlrgrid:generalGridAxis>
            <gmlrgrid:generalGridAxis><gmlrgrid:GeneralGridAxis>
              <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">0 0 1 0</gmlrgrid:offsetVector>
              <gmlrgrid:coefficients>${level}</gmlrgrid:coefficients><gmlrgrid:gridAxesSpanned>height</gmlrgrid:gridAxesSpanned>
            </gmlrgrid:GeneralGridAxis></gmlrgrid:generalGridAxis>
            <gmlrgrid:generalGridAxis><gmlrgrid:GeneralGridAxis>
              <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">0 0 0 1</gmlrgrid:offsetVector>
              <gmlrgrid:coefficients>0 3600 7200</gmlrgrid:coefficients><gmlrgrid:gridAxesSpanned>time</gmlrgrid:gridAxesSpanned>
            </gmlrgrid:GeneralGridAxis></gmlrgrid:generalGridAxis>
          </gmlrgrid:ReferenceableGridByVectors>
        </gml:domainSet>
        <gmlcov:rangeType><swe:DataRecord><swe:field name="${PREFIXES[variable]}">
          <swe:Quantity><swe:uom code="${UNITS[variable]}"/></swe:Quantity>
        </swe:field></swe:DataRecord></gmlcov:rangeType>
      </wcs:CoverageDescription>
    </wcs:CoverageDescriptions>`;
}

function digest(bytes: string | Uint8Array | ArrayBuffer) {
  return createHash("sha256").update(
    typeof bytes === "string" ? bytes : new Uint8Array(bytes),
  ).digest("hex");
}

function appendAsciiTiffTag(buffer: ArrayBuffer, tag: number, value: string) {
  const source = new Uint8Array(buffer);
  const sourceView = new DataView(buffer);
  const littleEndian = source[0] === 0x49 && source[1] === 0x49;
  if (!littleEndian && !(source[0] === 0x4d && source[1] === 0x4d)) {
    throw new Error("Fixture TIFF byte order is invalid");
  }
  const originalIfdOffset = sourceView.getUint32(4, littleEndian);
  const originalCount = sourceView.getUint16(originalIfdOffset, littleEndian);
  const entries = Array.from({ length: originalCount }, (_, index) =>
    source.slice(originalIfdOffset + 2 + index * 12, originalIfdOffset + 14 + index * 12)
  );
  const encoded = new TextEncoder().encode(`${value}\0`);
  const stringOffset = source.byteLength + (source.byteLength % 2);
  const newIfdOffset = stringOffset + encoded.byteLength + (encoded.byteLength % 2);
  const output = new Uint8Array(newIfdOffset + 2 + (entries.length + 1) * 12 + 4);
  output.set(source);
  output.set(encoded, stringOffset);
  const outputView = new DataView(output.buffer);
  outputView.setUint32(4, newIfdOffset, littleEndian);
  const tagEntry = new Uint8Array(12);
  const tagView = new DataView(tagEntry.buffer);
  tagView.setUint16(0, tag, littleEndian);
  tagView.setUint16(2, 2, littleEndian);
  tagView.setUint32(4, encoded.byteLength, littleEndian);
  tagView.setUint32(8, stringOffset, littleEndian);
  entries.push(tagEntry);
  entries.sort((left, right) =>
    new DataView(left.buffer, left.byteOffset, left.byteLength).getUint16(0, littleEndian) -
    new DataView(right.buffer, right.byteOffset, right.byteLength).getUint16(0, littleEndian)
  );
  outputView.setUint16(newIfdOffset, entries.length, littleEndian);
  entries.forEach((entry, index) => output.set(entry, newIfdOffset + 2 + index * 12));
  outputView.setUint32(newIfdOffset + 2 + entries.length * 12, 0, littleEndian);
  return output.buffer;
}

function tiffFixture(variable: Variable, values: number[], resolution = 0.01) {
  const level = variable === "wind_speed_10m" ? 10 : 2;
  const gdalMetadata = [
    "<GDALMetadata>",
    `<Item name="GRIB_ELEMENT" sample="0">${TIFF_ELEMENTS[variable]}</Item>`,
    `<Item name="GRIB_SHORT_NAME" sample="0">${level}-HTGL</Item>`,
    `<Item name="GRIB_UNIT" sample="0">[${TIFF_UNITS[variable]}]</Item>`,
    '<Item name="GRIB_REF_TIME" sample="0">1786762800</Item>',
    '<Item name="GRIB_VALID_TIME" sample="0">1786766400</Item>',
    '<Item name="GRIB_FORECAST_SECONDS" sample="0">3600</Item>',
    `<Item name="DESCRIPTION" sample="0">${level}[m] test level</Item>`,
    "</GDALMetadata>",
  ].join("");
  const metadata: Parameters<typeof writeArrayBuffer>[1] & {
    GeogAngularUnitsGeoKey: number;
    GeogSemiMajorAxisGeoKey: number;
  } = {
    width: 4,
    height: 3,
    ModelPixelScale: [resolution, resolution, 0],
    ModelTiepoint: [0, 0, 0, 1, 41.03, 0],
    GeographicTypeGeoKey: 32767,
    GTModelTypeGeoKey: 2,
    GTRasterTypeGeoKey: 2,
    GeogAngularUnitsGeoKey: 9102,
    GeogSemiMajorAxisGeoKey: 6_371_229,
    GeogCitationGeoKey: "GCS Name = Coordinate System imported from GRIB file|Datum = unnamed|Ellipsoid = Sphere|Primem = Greenwich|",
    GDAL_NODATA: "-9999",
  };
  return appendAsciiTiffTag(
    writeArrayBuffer(new Float32Array(values), metadata),
    42112,
    gdalMetadata,
  );
}

const tempDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(tempDirectories.splice(0).map((directory) =>
    rm(directory, { recursive: true, force: true })
  ));
});

async function artifactFixture(options: { driftedWindGrid?: boolean } = {}) {
  const directory = await mkdtemp(join(tmpdir(), "bolets-arome-artifacts-"));
  tempDirectories.push(directory);
  const capabilities = capabilitiesFixture();
  await writeFile(join(directory, "capabilities.xml"), capabilities);
  const values: Record<Variable, number[]> = {
    temperature_2m: [6.85, 7.85, 8.85, 9.85, 7.85, 8.85, 9.85, 10.85, 8.85, 9.85, 10.85, 11.85],
    relative_humidity_2m: [70, 71, 72, 73, 71, 72, 73, 74, 72, 73, 74, 75],
    wind_speed_10m: [3, 4, 5, 6, 4, 5, 6, 7, 5, 6, 7, 8],
  };
  const coverages = Object.fromEntries(await Promise.all(VARIABLES.map(async (variable) => {
    const description = describeFixture(variable);
    const tiff = tiffFixture(
      variable,
      values[variable],
      variable === "wind_speed_10m" && options.driftedWindGrid ? 0.02 : 0.01,
    );
    const fixtureImage = await (await fromArrayBuffer(tiff)).getImage();
    const fixtureMetadata = await fixtureImage.getGDALMetadata(0);
    if (fixtureMetadata?.GRIB_ELEMENT !== TIFF_ELEMENTS[variable]) {
      throw new Error("Fixture GeoTIFF metadata encoding failed");
    }
    const descriptionFile = `${variable}.xml`;
    const tiffFile = `${variable}.tiff`;
    await Promise.all([
      writeFile(join(directory, descriptionFile), description),
      writeFile(join(directory, tiffFile), new Uint8Array(tiff)),
    ]);
    const level = variable === "wind_speed_10m" ? 10 : 2;
    return [variable, {
      description: { file: descriptionFile, sha256: digest(description) },
      geotiff: {
        file: tiffFile,
        sha256: digest(tiff),
        contentType: "image/tiff",
        request: {
          variable,
          coverageId: coverageId(variable),
          runAt: RUN_AT,
          validAt: VALID_AT,
          leadSeconds: 3600,
          level: { axis: "height", value: level, unit: "m" },
          valueUnit: UNITS[variable],
          transport: {
            format: "image/tiff",
            valueUnit: TIFF_UNITS[variable],
            scaleToDeclaredUnit: 1,
            offsetToDeclaredUnit: variable === "temperature_2m" ? 273.15 : 0,
          },
        },
      },
    }];
  })));
  const manifest = {
    schema: AROME_POINT_ARTIFACT_SCHEMA,
    runAt: RUN_AT,
    validAt: VALID_AT,
    capabilities: { file: "capabilities.xml", sha256: digest(capabilities) },
    coverages,
  };
  const manifestPath = join(directory, "manifest.json");
  const pointsPath = join(directory, "private-points.json");
  await Promise.all([
    writeFile(manifestPath, JSON.stringify(manifest)),
    writeFile(pointsPath, JSON.stringify([
      { latitude: 41.03, longitude: 1 },
      { latitude: 41.01, longitude: 1.02 },
    ])),
  ]);
  return { directory, manifest, manifestPath, pointsPath };
}

describe("offline direct AROME point artifacts", () => {
  it("validates one common run, hour, unit contract and aligned grid before sampling", async () => {
    const fixture = await artifactFixture();
    const result = await compareAromePointArtifacts({
      manifestPath: fixture.manifestPath,
      pointsPath: fixture.pointsPath,
      repositoryRoot: process.cwd(),
    });

    expect(result).toMatchObject({
      schema: "arome-point-comparison-v1",
      status: "offline-shadow-diagnostic",
      provider: "Météo-France",
      model: "AROME",
      runAt: RUN_AT,
      validAt: VALID_AT,
      leadHours: 1,
      nativeGrid: {
        angularResolutionDegrees: 0.01,
        coordinateReferenceSystem: "Météo-France GRIB geographic sphere",
        sphereRadiusMetres: 6_371_229,
        rasterInterpretation: "pixel-is-point",
      },
      locations: [
        {
          location: "Location 1",
          temperature2m: { value: 6.85, unit: "°C" },
          relativeHumidity2m: { value: 70, unit: "%" },
          windSpeed10m: { value: 3, unit: "m/s" },
        },
        {
          location: "Location 2",
          temperature2m: { value: 10.85, unit: "°C" },
          relativeHumidity2m: { value: 74, unit: "%" },
          windSpeed10m: { value: 7, unit: "m/s" },
        },
      ],
      differencesFromLocation1: [{
        location: "Location 2",
        temperature2mDifference: { value: 4, unit: "°C" },
        relativeHumidity2mDifference: { value: 4, unit: "percentage points" },
        windSpeed10mDifference: { value: 4, unit: "m/s" },
      }],
    });
    const publicOutput = JSON.stringify(result);
    expect(publicOutput).not.toContain("41.03");
    expect(publicOutput).not.toContain('"longitude":1');
    expect(publicOutput).not.toContain(fixture.directory);
  });

  it("rejects a mixed request contract before returning sampled values", async () => {
    const fixture = await artifactFixture();
    fixture.manifest.coverages.temperature_2m.geotiff.request.valueUnit = "Cel";
    await writeFile(fixture.manifestPath, JSON.stringify(fixture.manifest));

    await expect(compareAromePointArtifacts({
      manifestPath: fixture.manifestPath,
      pointsPath: fixture.pointsPath,
      repositoryRoot: process.cwd(),
    })).rejects.toThrow(/does not match the validated WCS contract/);
  });

  it("rejects a GeoTIFF that is not on the described 0.01-degree grid", async () => {
    const fixture = await artifactFixture({ driftedWindGrid: true });

    await expect(compareAromePointArtifacts({
      manifestPath: fixture.manifestPath,
      pointsPath: fixture.pointsPath,
      repositoryRoot: process.cwd(),
    })).rejects.toThrow(/required 0\.01-degree north-up point grid/);
  });

  it("discards private source labels and rejects credential-like fields", () => {
    expect(parsePrivateAromePoints([
      { latitude: 41, longitude: 1, label: "secret-place" },
    ])).toEqual([{ latitude: 41, longitude: 1, label: "Location 1" }]);

    expect(() => parsePrivateAromePoints([
      { latitude: 41, longitude: 1, apiKey: "not-accepted" },
    ])).toThrow(/unsupported fields/);

    expect(() => parseAromePointArtifactManifest({
      schema: AROME_POINT_ARTIFACT_SCHEMA,
      runAt: RUN_AT,
      validAt: VALID_AT,
      capabilities: { file: "capabilities.xml", sha256: "a".repeat(64) },
      coverages: {},
      apiKey: "not-accepted",
    })).toThrow(/unsupported fields/);
  });

  it("redacts private paths, precise numbers, and credential-like values from CLI errors", () => {
    const sanitized = sanitizeAromePointDiagnosticError(new Error(
      "Failed /tmp/private/place/file.tiff at 41.123456 token=secret-value",
    ));
    expect(sanitized).toContain("[private-path]");
    expect(sanitized).toContain("[private-number]");
    expect(sanitized).toContain("token=[redacted]");
    expect(sanitized).not.toContain("secret-value");
    expect(sanitized).not.toContain("41.123456");
  });

  it("runs through the offline CLI and prints Location labels without private coordinates", async () => {
    const fixture = await artifactFixture();
    const script = join(process.cwd(), "scripts", "compare-arome-point-artifacts.mjs");
    const result = spawnSync(process.execPath, [
      script,
      `--manifest=${fixture.manifestPath}`,
      `--points-file=${fixture.pointsPath}`,
    ], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"location": "Location 1"');
    expect(result.stdout).toContain('"location": "Location 2"');
    expect(result.stdout).not.toContain("41.03");
    expect(result.stdout).not.toContain('"longitude":1');
    expect(result.stdout).not.toContain(fixture.directory);
  });
});
