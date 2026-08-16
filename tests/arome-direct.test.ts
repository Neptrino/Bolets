import { describe, expect, it } from "vitest";
import {
  AROME_DIRECT_DATASET_ID,
  AROME_DIRECT_PROVENANCE,
  buildAromeCapabilitiesUrl,
  buildAromeDescribeCoverageUrl,
  buildAromeGetCoverageRequest,
  parseAromeCapabilities,
  parseAromeCoverageDescription,
  sanitizeAromeError,
  type AromeCoverageSelection,
  type AromeDirectVariable,
} from "@/supabase/functions/_shared/arome-direct";

const COVERAGE_PREFIXES: Record<AromeDirectVariable, string> = {
  temperature_2m: "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
  relative_humidity_2m: "RELATIVE_HUMIDITY__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
  wind_speed_10m: "WIND_SPEED__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
};

function coverageId(variable: AromeDirectVariable, run = "2026-08-15T03.00.00Z") {
  return `${COVERAGE_PREFIXES[variable]}___${run}`;
}

function capabilitiesFixture(runs = ["2026-08-15T00.00.00Z", "2026-08-15T03.00.00Z"]) {
  const summaries = runs.flatMap((run) =>
    (Object.keys(COVERAGE_PREFIXES) as AromeDirectVariable[]).map((variable) => `
      <catalog:CoverageSummary>
        <catalog:CoverageId>${coverageId(variable, run)}</catalog:CoverageId>
      </catalog:CoverageSummary>`)
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
    <catalog:Capabilities xmlns:catalog="http://www.opengis.net/wcs/2.0">
      <catalog:Contents>
        ${summaries}
        <catalog:CoverageSummary>
          <catalog:CoverageId>WIND_SPEED_GUST__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND___2026-08-15T06.00.00Z</catalog:CoverageId>
        </catalog:CoverageSummary>
        <catalog:CoverageSummary>
          <catalog:CoverageId>TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND___2026-08-15T06.00.00Z_PT1H</catalog:CoverageId>
        </catalog:CoverageSummary>
      </catalog:Contents>
    </catalog:Capabilities>`;
}

function selection(variable: AromeDirectVariable): AromeCoverageSelection {
  const level = variable === "wind_speed_10m" ? 10 : 2;
  return {
    variable,
    coverageId: coverageId(variable),
    runAt: "2026-08-15T03:00:00.000Z",
    level: { axis: "height", value: level },
    provenance: AROME_DIRECT_PROVENANCE,
  };
}

function describeFixture(
  variable: AromeDirectVariable,
  options: {
    spatialStep?: number;
    id?: string;
    rangeFieldName?: string;
    valueUnit?: string;
  } = {},
) {
  const level = variable === "wind_speed_10m" ? 10 : 2;
  const levels = variable === "wind_speed_10m" ? "10 20 50 100" : String(level);
  const unit = options.valueUnit ?? (
    variable === "temperature_2m" ? "K" : variable === "relative_humidity_2m" ? "%" : "m s-1"
  );
  const step = options.spatialStep ?? 0.01;
  const id = options.id ?? coverageId(variable);
  const rangeFieldName = options.rangeFieldName ?? COVERAGE_PREFIXES[variable];
  return `<?xml version="1.0"?>
    <wcs:CoverageDescriptions
      xmlns:wcs="http://www.opengis.net/wcs/2.0"
      xmlns:gml="http://www.opengis.net/gml/3.2"
      xmlns:gmlrgrid="http://www.opengis.net/gml/3.3/rgrid"
      xmlns:gmlcov="http://www.opengis.net/gmlcov/1.0"
      xmlns:swe="http://www.opengis.net/swe/2.0">
      <wcs:CoverageDescription gml:id="${id}">
        <gml:boundedBy>
          <gml:EnvelopeWithTimePeriod
            axisLabels="long lat height time"
            uomLabels="deg deg m ISO8601"
            srsDimension="3">
            <gml:lowerCorner>-5 40 ${level}</gml:lowerCorner>
            <gml:upperCorner>10 50 ${level}</gml:upperCorner>
            <gml:beginPosition>2026-08-15T03:00:00Z</gml:beginPosition>
            <gml:endPosition>2026-08-15T05:00:00Z</gml:endPosition>
          </gml:EnvelopeWithTimePeriod>
        </gml:boundedBy>
        <wcs:CoverageId>${id}</wcs:CoverageId>
        <gml:domainSet>
          <gmlrgrid:ReferenceableGridByVectors dimension="4">
            <gml:axisLabels>long lat height time</gml:axisLabels>
            <gmlrgrid:generalGridAxis>
              <gmlrgrid:GeneralGridAxis>
                <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">${step} 0 0 0</gmlrgrid:offsetVector>
                <gmlrgrid:coefficients></gmlrgrid:coefficients>
                <gmlrgrid:gridAxesSpanned>long</gmlrgrid:gridAxesSpanned>
              </gmlrgrid:GeneralGridAxis>
            </gmlrgrid:generalGridAxis>
            <gmlrgrid:generalGridAxis>
              <gmlrgrid:GeneralGridAxis>
                <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">0 -${step} 0 0</gmlrgrid:offsetVector>
                <gmlrgrid:coefficients/>
                <gmlrgrid:gridAxesSpanned>lat</gmlrgrid:gridAxesSpanned>
              </gmlrgrid:GeneralGridAxis>
            </gmlrgrid:generalGridAxis>
            <gmlrgrid:generalGridAxis>
              <gmlrgrid:GeneralGridAxis>
                <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">0 0 1 0</gmlrgrid:offsetVector>
                <gmlrgrid:coefficients>${levels}</gmlrgrid:coefficients>
                <gmlrgrid:gridAxesSpanned>height</gmlrgrid:gridAxesSpanned>
              </gmlrgrid:GeneralGridAxis>
            </gmlrgrid:generalGridAxis>
            <gmlrgrid:generalGridAxis>
              <gmlrgrid:GeneralGridAxis>
                <gmlrgrid:offsetVector axisLabels="long lat height time" uomLabels="deg deg m s">0 0 0 1</gmlrgrid:offsetVector>
                <gmlrgrid:coefficients>0 3600 7200</gmlrgrid:coefficients>
                <gmlrgrid:gridAxesSpanned>time</gmlrgrid:gridAxesSpanned>
              </gmlrgrid:GeneralGridAxis>
            </gmlrgrid:generalGridAxis>
          </gmlrgrid:ReferenceableGridByVectors>
        </gml:domainSet>
        <gmlcov:rangeType>
          <swe:DataRecord>
            <swe:field name="${rangeFieldName}">
              <swe:Quantity>
                <swe:uom code="${unit}"/>
              </swe:Quantity>
            </swe:field>
          </swe:DataRecord>
        </gmlcov:rangeType>
      </wcs:CoverageDescription>
    </wcs:CoverageDescriptions>`;
}

describe("direct Météo-France AROME shadow adapter", () => {
  it("targets only the official high-resolution 0.01-degree WCS endpoint", () => {
    const url = buildAromeCapabilitiesUrl();
    expect(url.pathname).toBe(
      `/public/arome/1.0/wcs/${AROME_DIRECT_DATASET_ID}-WCS/GetCapabilities`,
    );
    expect(url.searchParams.get("service")).toBe("WCS");
    expect(url.searchParams.get("version")).toBe("2.0.1");
    expect(url.searchParams.has("token")).toBe(false);
    expect(url.searchParams.has("apikey")).toBe(false);
  });

  it("selects the latest common run for the exact temperature, humidity, and wind fields", () => {
    const result = parseAromeCapabilities(capabilitiesFixture());

    expect(result.runAt).toBe("2026-08-15T03:00:00.000Z");
    expect(Object.keys(result.coverages)).toEqual([
      "temperature_2m",
      "relative_humidity_2m",
      "wind_speed_10m",
    ]);
    expect(result.coverages.temperature_2m.level).toEqual({ axis: "height", value: 2 });
    expect(result.coverages.wind_speed_10m.level).toEqual({ axis: "height", value: 10 });
    expect(result.coverages.wind_speed_10m.coverageId).not.toContain("GUST");
    expect(result.coverages.temperature_2m.provenance).toBe(AROME_DIRECT_PROVENANCE);
  });

  it("can select a requested complete run rather than silently mixing model runs", () => {
    const result = parseAromeCapabilities(
      capabilitiesFixture(),
      "2026-08-15T00:00:00Z",
    );
    expect(result.runAt).toBe("2026-08-15T00:00:00.000Z");
    expect(Object.values(result.coverages).every((item) => item.runAt === result.runAt)).toBe(true);
  });

  it("withholds the shadow batch when no common run contains all three fields", () => {
    const xml = capabilitiesFixture(["2026-08-15T03.00.00Z"])
      .replace(coverageId("relative_humidity_2m"), "CLOUD_COVER__GROUND_OR_WATER_SURFACE");
    expect(() => parseAromeCapabilities(xml)).toThrow(/no common run/);
  });

  it("rejects XML document types rather than resolving provider-controlled entities", () => {
    const xml = capabilitiesFixture().replace(
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<?xml version=\"1.0\"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM \"file:///tmp/private\">]>",
    );
    expect(() => parseAromeCapabilities(xml)).toThrow(/forbidden document type/);
  });

  it("builds DescribeCoverage without putting credentials in the URL", () => {
    const url = buildAromeDescribeCoverageUrl(selection("temperature_2m"));
    expect(url.pathname.endsWith("/DescribeCoverage")).toBe(true);
    expect(url.searchParams.get("coverageID")).toBe(coverageId("temperature_2m"));
    expect(url.searchParams.has("authorization")).toBe(false);
    expect(url.searchParams.has("token")).toBe(false);
  });

  it.each([
    ["temperature_2m", "K", 2],
    ["relative_humidity_2m", "%", 2],
    ["wind_speed_10m", "m s-1", 10],
  ] as const)("retains %s run, axes, level, units, and provenance", (variable, unit, level) => {
    const result = parseAromeCoverageDescription(describeFixture(variable), selection(variable));

    expect(result.coverageId).toBe(coverageId(variable));
    expect(result.runAt).toBe("2026-08-15T03:00:00.000Z");
    expect(result.level).toMatchObject({ axis: "height", value: level, unit: "m" });
    expect(result.value).toEqual({ fieldName: COVERAGE_PREFIXES[variable], unit });
    expect(result.availableLeadSeconds).toEqual([0, 3600, 7200]);
    expect(result.validFrom).toBe("2026-08-15T03:00:00.000Z");
    expect(result.validUntil).toBe("2026-08-15T05:00:00.000Z");
    expect(result.nativeGrid).toEqual({
      longitudeStepDegrees: 0.01,
      latitudeStepDegrees: -0.01,
    });
    expect(result.provenance).toEqual(AROME_DIRECT_PROVENANCE);
  });

  it("rejects an AROME IFS-style 0.025-degree coverage from the direct shadow stream", () => {
    expect(() => parseAromeCoverageDescription(
      describeFixture("temperature_2m", { spatialStep: 0.025 }),
      selection("temperature_2m"),
    )).toThrow(/required 0\.01-degree grid/);
  });

  it("rejects a DescribeCoverage response for a different field or run", () => {
    expect(() => parseAromeCoverageDescription(
      describeFixture("relative_humidity_2m"),
      selection("temperature_2m"),
    )).toThrow(/does not match the requested coverage/);
  });

  it("fails closed when a selected range field identity or unit drifts", () => {
    expect(() => parseAromeCoverageDescription(
      describeFixture("temperature_2m", { rangeFieldName: "air_temperature" }),
      selection("temperature_2m"),
    )).toThrow(/range field or unit has drifted/);
    expect(() => parseAromeCoverageDescription(
      describeFixture("temperature_2m", { valueUnit: "Cel" }),
      selection("temperature_2m"),
    )).toThrow(/range field or unit has drifted/);
  });

  it.each([
    ["longitude grid", /uomLabels="deg deg m s"/g, 'uomLabels="rad deg m s"'],
    ["latitude grid", /uomLabels="deg deg m s"/g, 'uomLabels="deg rad m s"'],
    ["height grid", /uomLabels="deg deg m s"/g, 'uomLabels="deg deg cm s"'],
    [
      "bounded envelope",
      'uomLabels="deg deg m ISO8601"',
      'uomLabels="deg deg cm ISO8601"',
    ],
  ] as const)("fails closed when the %s unit drifts", (_label, pattern, replacement) => {
    const drifted = describeFixture("temperature_2m").replace(pattern, replacement);
    expect(() => parseAromeCoverageDescription(
      drifted,
      selection("temperature_2m"),
    )).toThrow(/must use degrees|must use metres|required dimension units/);
  });

  it("uses one repeated subset parameter per WCS axis and preserves request metadata", () => {
    const description = parseAromeCoverageDescription(
      describeFixture("wind_speed_10m"),
      selection("wind_speed_10m"),
    );
    const request = buildAromeGetCoverageRequest(description, {
      validAt: "2026-08-15T04:00:00Z",
      bounds: {
        minLatitude: 41,
        maxLatitude: 42,
        minLongitude: 1,
        maxLongitude: 2,
      },
    });

    expect(request.url.searchParams.getAll("subset")).toEqual([
      "time(2026-08-15T04:00:00Z)",
      "height(10)",
      "lat(41.0,42.0)",
      "long(1.0,2.0)",
    ]);
    expect(request.url.searchParams.get("format")).toBe("application/wmo-grib");
    expect(request.metadata).toMatchObject({
      variable: "wind_speed_10m",
      runAt: "2026-08-15T03:00:00.000Z",
      validAt: "2026-08-15T04:00:00.000Z",
      leadSeconds: 3600,
      level: { axis: "height", value: 10, unit: "m" },
      valueUnit: "m s-1",
      transport: {
        format: "application/wmo-grib",
        valueUnit: "m s-1",
        scaleToDeclaredUnit: 1,
        offsetToDeclaredUnit: 0,
      },
    });
    expect(request.metadata.provenance).toBe(AROME_DIRECT_PROVENANCE);
  });

  it("records the live GeoTIFF transport unit without changing the declared field unit", () => {
    const description = parseAromeCoverageDescription(
      describeFixture("temperature_2m"),
      selection("temperature_2m"),
    );
    const request = buildAromeGetCoverageRequest(description, {
      validAt: "2026-08-15T04:00:00Z",
      bounds: { minLatitude: 41, maxLatitude: 42, minLongitude: 1, maxLongitude: 2 },
      format: "image/tiff",
    });

    expect(request.url.searchParams.getAll("subset")[1]).toBe("height(2)");
    expect(request.metadata.valueUnit).toBe("K");
    expect(request.metadata.transport).toEqual({
      format: "image/tiff",
      valueUnit: "C",
      scaleToDeclaredUnit: 1,
      offsetToDeclaredUnit: 273.15,
    });
  });

  it("withholds unavailable valid times and out-of-domain subsets", () => {
    const description = parseAromeCoverageDescription(
      describeFixture("temperature_2m"),
      selection("temperature_2m"),
    );
    expect(() => buildAromeGetCoverageRequest(description, {
      validAt: "2026-08-15T04:30:00Z",
      bounds: { minLatitude: 41, maxLatitude: 42, minLongitude: 1, maxLongitude: 2 },
    })).toThrow(/not an available forecast lead/);
    expect(() => buildAromeGetCoverageRequest(description, {
      validAt: "2026-08-15T04:00:00Z",
      bounds: { minLatitude: 39, maxLatitude: 42, minLongitude: 1, maxLongitude: 2 },
    })).toThrow(/exceed the described coverage extent/);
  });

  it("sanitizes provider errors before they can reach ingestion logs", () => {
    const sanitized = sanitizeAromeError(new Error(
      "403 https://provider.invalid/fetch?access_token=top-secret&lat=42.123 Authorization: Bearer opaque.bearer.value client_secret=hunter2\nretry",
    ));

    expect(sanitized).toContain("403 https://provider.invalid/fetch");
    expect(sanitized).toContain("Bearer [redacted]");
    expect(sanitized).toContain("client_secret=[redacted]");
    expect(sanitized).not.toContain("top-secret");
    expect(sanitized).not.toContain("42.123");
    expect(sanitized).not.toContain("opaque.bearer.value");
    expect(sanitized).not.toContain("hunter2");
    expect(sanitized).not.toContain("\n");
  });
});
