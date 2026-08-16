export const AROME_DIRECT_WCS_VERSION = "2.0.1";
export const AROME_DIRECT_NATIVE_RESOLUTION_DEGREES = 0.01;
export const AROME_DIRECT_DATASET_ID = "MF-NWP-HIGHRES-AROME-001-FRANCE";
export const AROME_DIRECT_WCS_BASE_URL =
  `https://public-api.meteofrance.fr/public/arome/1.0/wcs/${AROME_DIRECT_DATASET_ID}-WCS`;

export const AROME_DIRECT_PROVENANCE = Object.freeze({
  provider: "Météo-France",
  model: "AROME",
  datasetId: AROME_DIRECT_DATASET_ID,
  grid: "0.01-degree",
  nativeAngularResolutionDegrees: AROME_DIRECT_NATIVE_RESOLUTION_DEGREES,
  service: "WCS",
  serviceVersion: AROME_DIRECT_WCS_VERSION,
  sourceUrl: AROME_DIRECT_WCS_BASE_URL,
});

export type AromeDirectVariable =
  | "temperature_2m"
  | "relative_humidity_2m"
  | "wind_speed_10m";

type CoverageSpec = {
  coveragePrefix: string;
  levelAxis: "height";
  levelValue: number;
  rangeUnit: string;
  tiffValueUnit: string;
  tiffOffsetToRangeUnit: number;
};

const COVERAGE_SPECS: Record<AromeDirectVariable, CoverageSpec> = {
  temperature_2m: {
    coveragePrefix: "TEMPERATURE__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
    levelAxis: "height",
    levelValue: 2,
    rangeUnit: "K",
    tiffValueUnit: "C",
    tiffOffsetToRangeUnit: 273.15,
  },
  relative_humidity_2m: {
    coveragePrefix: "RELATIVE_HUMIDITY__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
    levelAxis: "height",
    levelValue: 2,
    rangeUnit: "%",
    tiffValueUnit: "%",
    tiffOffsetToRangeUnit: 0,
  },
  wind_speed_10m: {
    coveragePrefix: "WIND_SPEED__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND",
    levelAxis: "height",
    levelValue: 10,
    rangeUnit: "m s-1",
    tiffValueUnit: "m/s",
    tiffOffsetToRangeUnit: 0,
  },
};

const VARIABLES = Object.keys(COVERAGE_SPECS) as AromeDirectVariable[];
const MAX_XML_CHARACTERS = 8_000_000;
const XML_NAME_PREFIX = "(?:[A-Za-z_][A-Za-z0-9_.-]*:)?";
const ISO_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const COVERAGE_RUN_PATTERN =
  /^(TEMPERATURE|RELATIVE_HUMIDITY|WIND_SPEED)__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND___(\d{4}-\d{2}-\d{2}T\d{2}\.\d{2}\.\d{2}Z)$/;

export type AromeCoverageSelection = {
  variable: AromeDirectVariable;
  coverageId: string;
  runAt: string;
  level: {
    axis: "height";
    value: number;
  };
  provenance: typeof AROME_DIRECT_PROVENANCE;
};

export type AromeAxisDescription = {
  name: string;
  unit: string;
  axisLabels: string[];
  offsetVector: number[];
  coefficients: number[];
};

export type AromeCoverageDescription = AromeCoverageSelection & {
  axes: Record<string, AromeAxisDescription>;
  level: {
    axis: "height";
    value: number;
    unit: string;
    availableValues: number[];
  };
  availableLeadSeconds: number[];
  validFrom: string;
  validUntil: string;
  value: {
    fieldName: string;
    unit: string;
  };
  extent: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  };
  nativeGrid: {
    longitudeStepDegrees: number;
    latitudeStepDegrees: number;
  };
};

export type AromeCoverageBounds = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
};

export type AromeCoverageRequest = {
  url: URL;
  metadata: {
    variable: AromeDirectVariable;
    coverageId: string;
    runAt: string;
    validAt: string;
    leadSeconds: number;
    level: {
      axis: "height";
      value: number;
      unit: string;
    };
    valueUnit: string;
    transport: {
      format: "application/wmo-grib" | "image/tiff";
      valueUnit: string;
      scaleToDeclaredUnit: number;
      offsetToDeclaredUnit: number;
    };
    bounds: AromeCoverageBounds;
    provenance: typeof AROME_DIRECT_PROVENANCE;
  };
};

function assertSafeXml(xml: string, label: string) {
  if (typeof xml !== "string" || !xml.trim()) throw new Error(`${label} XML is empty`);
  if (xml.length > MAX_XML_CHARACTERS) throw new Error(`${label} XML exceeds the size limit`);
  if (/<!DOCTYPE\b|<!ENTITY\b/i.test(xml)) {
    throw new Error(`${label} XML contains a forbidden document type or entity declaration`);
  }
  if (/<!\[CDATA\[/i.test(xml)) throw new Error(`${label} XML contains unsupported CDATA`);
  const withoutDeclaration = xml.replace(/^\s*<\?xml\s[^?]*\?>/i, "");
  if (/<\?/.test(withoutDeclaration)) throw new Error(`${label} XML contains unsupported processing instructions`);
  return withoutDeclaration.replace(/<!--[\s\S]*?-->/g, "");
}

function decodeXml(value: string, label: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    const normalized = entity.toLowerCase();
    if (normalized === "amp") return "&";
    if (normalized === "lt") return "<";
    if (normalized === "gt") return ">";
    if (normalized === "quot") return '"';
    if (normalized === "apos") return "'";
    const codePoint = normalized.startsWith("#x")
      ? Number.parseInt(normalized.slice(2), 16)
      : Number.parseInt(normalized.slice(1), 10);
    if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff ||
      (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      throw new Error(`${label} XML contains an invalid character reference`);
    }
    return String.fromCodePoint(codePoint);
  }).replace(/&[A-Za-z0-9#]+;/g, () => {
    throw new Error(`${label} XML contains an unsupported entity reference`);
  });
}

function elementBodies(xml: string, localName: string) {
  const expression = new RegExp(
    `<${XML_NAME_PREFIX}${localName}\\b[^>]*>([\\s\\S]*?)<\\/${XML_NAME_PREFIX}${localName}\\s*>`,
    "gi",
  );
  return [...xml.matchAll(expression)].map((match) => match[1]);
}

function elements(xml: string, localName: string) {
  const expression = new RegExp(
    `<${XML_NAME_PREFIX}${localName}\\b([^>]*)>([\\s\\S]*?)<\\/${XML_NAME_PREFIX}${localName}\\s*>`,
    "gi",
  );
  return [...xml.matchAll(expression)].map((match) => ({ attributes: match[1], body: match[2] }));
}

function firstElement(xml: string, localName: string, label: string) {
  const matches = elements(xml, localName);
  if (matches.length !== 1) throw new Error(`${label} XML must contain exactly one ${localName}`);
  return matches[0];
}

function firstText(xml: string, localName: string, label: string) {
  const match = firstElement(xml, localName, label);
  const text = decodeXml(match.body.replace(/<[^>]*>/g, "").trim(), label);
  if (!text) throw new Error(`${label} XML has an empty ${localName}`);
  return text;
}

function optionalText(xml: string, localName: string, label: string) {
  const matches = elements(xml, localName);
  if (matches.length > 1) throw new Error(`${label} XML contains duplicate ${localName} elements`);
  if (matches.length === 0) return "";
  return decodeXml(matches[0].body.replace(/<[^>]*>/g, "").trim(), label);
}

function attribute(attributes: string, name: string, label: string) {
  const expression = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i");
  const match = expression.exec(attributes);
  return match ? decodeXml(match[2], label) : "";
}

function parseNumberList(value: string, label: string, allowEmpty = false) {
  const parts = value.trim() ? value.trim().split(/\s+/) : [];
  if (!allowEmpty && parts.length === 0) throw new Error(`${label} is empty`);
  const values = parts.map(Number);
  if (values.some((entry) => !Number.isFinite(entry))) throw new Error(`${label} contains a non-numeric value`);
  return values;
}

function canonicalInstant(value: string, label: string) {
  if (!ISO_INSTANT_PATTERN.test(value)) throw new Error(`${label} must be an ISO 8601 UTC instant`);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an ISO 8601 UTC instant`);
  return new Date(parsed).toISOString();
}

function selectionFromCoverageId(coverageId: string): Omit<AromeCoverageSelection, "provenance"> {
  const match = COVERAGE_RUN_PATTERN.exec(coverageId);
  if (!match) throw new Error("AROME coverage ID is outside the exact shadow field contract");
  const variable = VARIABLES.find((candidate) =>
    COVERAGE_SPECS[candidate].coveragePrefix ===
      `${match[1]}__SPECIFIC_HEIGHT_LEVEL_ABOVE_GROUND`
  );
  if (!variable) throw new Error("AROME coverage ID is outside the exact shadow field contract");
  const runAt = canonicalInstant(match[2].replace(
    /T(\d{2})\.(\d{2})\.(\d{2})Z$/,
    "T$1:$2:$3Z",
  ), "AROME model run");
  const spec = COVERAGE_SPECS[variable];
  return {
    variable,
    coverageId,
    runAt,
    level: { axis: spec.levelAxis, value: spec.levelValue },
  };
}

export function buildAromeCapabilitiesUrl() {
  const url = new URL(`${AROME_DIRECT_WCS_BASE_URL}/GetCapabilities`);
  url.searchParams.set("service", "WCS");
  url.searchParams.set("version", AROME_DIRECT_WCS_VERSION);
  url.searchParams.set("language", "eng");
  return url;
}

export function parseAromeCapabilities(xmlInput: string, requestedRunAt?: string) {
  const xml = assertSafeXml(xmlInput, "AROME GetCapabilities");
  if (!new RegExp(`<${XML_NAME_PREFIX}Capabilities\\b`, "i").test(xml)) {
    throw new Error("AROME GetCapabilities XML has an unexpected root element");
  }
  const coverageIds = elementBodies(xml, "CoverageId").map((body) =>
    decodeXml(body.replace(/<[^>]*>/g, "").trim(), "AROME GetCapabilities")
  );
  if (coverageIds.length === 0) throw new Error("AROME GetCapabilities XML contains no coverages");

  const byRun = new Map<string, Map<AromeDirectVariable, Omit<AromeCoverageSelection, "provenance">>>();
  for (const coverageId of new Set(coverageIds)) {
    let selection: Omit<AromeCoverageSelection, "provenance">;
    try {
      selection = selectionFromCoverageId(coverageId);
    } catch {
      continue;
    }
    const run = byRun.get(selection.runAt) ?? new Map();
    if (run.has(selection.variable)) {
      throw new Error(`AROME GetCapabilities contains duplicate ${selection.variable} coverages for one run`);
    }
    run.set(selection.variable, selection);
    byRun.set(selection.runAt, run);
  }

  const completeRuns = [...byRun.entries()]
    .filter(([, coverages]) => VARIABLES.every((variable) => coverages.has(variable)))
    .sort(([left], [right]) => Date.parse(right) - Date.parse(left));
  if (completeRuns.length === 0) {
    throw new Error("AROME GetCapabilities has no common run for temperature, humidity, and wind");
  }

  const requested = requestedRunAt
    ? canonicalInstant(requestedRunAt, "requested AROME run")
    : undefined;
  const selected = requested
    ? completeRuns.find(([runAt]) => runAt === requested)
    : completeRuns[0];
  if (!selected) throw new Error("The requested AROME run is not complete in GetCapabilities");
  const [runAt, coverages] = selected;
  return {
    runAt,
    coverages: Object.fromEntries(VARIABLES.map((variable) => [variable, {
      ...coverages.get(variable)!,
      provenance: AROME_DIRECT_PROVENANCE,
    }])) as Record<AromeDirectVariable, AromeCoverageSelection>,
  };
}

export function buildAromeDescribeCoverageUrl(selection: AromeCoverageSelection) {
  const parsed = selectionFromCoverageId(selection.coverageId);
  if (parsed.variable !== selection.variable || parsed.runAt !== selection.runAt) {
    throw new Error("AROME coverage selection metadata does not match its coverage ID");
  }
  const url = new URL(`${AROME_DIRECT_WCS_BASE_URL}/DescribeCoverage`);
  url.searchParams.set("service", "WCS");
  url.searchParams.set("version", AROME_DIRECT_WCS_VERSION);
  url.searchParams.set("coverageID", selection.coverageId);
  return url;
}

function offsetMetadata(offsetAttributes: string, axisName: string, label: string) {
  const labels = attribute(offsetAttributes, "axisLabels", label).trim().split(/\s+/);
  const units = attribute(offsetAttributes, "uomLabels", label).trim().split(/\s+/);
  if (labels.length === 0 || labels.length !== units.length || labels.some((entry) => !entry)) {
    throw new Error(`${label} has inconsistent offset-vector labels and units`);
  }
  const index = labels.indexOf(axisName);
  if (index < 0 || !units[index]) throw new Error(`${label} does not declare a unit for ${axisName}`);
  return { axisLabels: labels, unit: units[index] };
}

function parseAxes(domainXml: string, label: string) {
  const axes: Record<string, AromeAxisDescription> = {};
  for (const axisElement of elements(domainXml, "GeneralGridAxis")) {
    const name = firstText(axisElement.body, "gridAxesSpanned", label);
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) throw new Error(`${label} contains an invalid axis name`);
    if (axes[name]) throw new Error(`${label} contains duplicate ${name} axes`);
    const offset = firstElement(axisElement.body, "offsetVector", label);
    const coefficients = optionalText(axisElement.body, "coefficients", label);
    const metadata = offsetMetadata(offset.attributes, name, label);
    const offsetVector = parseNumberList(
      decodeXml(offset.body.replace(/<[^>]*>/g, "").trim(), label),
      `${label} ${name} offset vector`,
    );
    if (offsetVector.length !== metadata.axisLabels.length) {
      throw new Error(`${label} ${name} offset vector has inconsistent dimensions`);
    }
    axes[name] = {
      name,
      unit: metadata.unit,
      axisLabels: metadata.axisLabels,
      offsetVector,
      coefficients: parseNumberList(coefficients, `${label} ${name} coefficients`, true),
    };
  }
  return axes;
}

function componentStep(axis: AromeAxisDescription, component: string, label: string) {
  const componentIndex = axis.axisLabels.indexOf(component);
  if (componentIndex < 0) {
    throw new Error(`${label} has inconsistent grid-axis dimensions`);
  }
  return axis.offsetVector[componentIndex];
}

function assertNativeGrid(axes: Record<string, AromeAxisDescription>, label: string) {
  const longitude = axes.long;
  const latitude = axes.lat;
  if (!longitude || !latitude) throw new Error(`${label} must declare long and lat axes`);
  if (longitude.unit !== "deg" || latitude.unit !== "deg") {
    throw new Error("AROME shadow coverage longitude and latitude axes must use degrees");
  }
  const longitudeStep = componentStep(longitude, "long", label);
  const latitudeStep = componentStep(latitude, "lat", label);
  if (Math.abs(Math.abs(longitudeStep) - AROME_DIRECT_NATIVE_RESOLUTION_DEGREES) > 1e-9 ||
    Math.abs(Math.abs(latitudeStep) - AROME_DIRECT_NATIVE_RESOLUTION_DEGREES) > 1e-9) {
    throw new Error("AROME shadow coverage is not on the required 0.01-degree grid");
  }
  return { longitudeStepDegrees: longitudeStep, latitudeStepDegrees: latitudeStep };
}

function rangeValue(rangeTypeXml: string, label: string) {
  const field = firstElement(rangeTypeXml, "field", label);
  const fieldName = attribute(field.attributes, "name", label);
  if (!fieldName || fieldName.length > 160) throw new Error(`${label} has an invalid range field name`);
  const quantity = firstElement(field.body, "Quantity", label);
  const unitElements = [
    ...quantity.body.matchAll(new RegExp(`<${XML_NAME_PREFIX}uom\\b([^>]*)\\/?\\s*>`, "gi")),
  ];
  if (unitElements.length !== 1) throw new Error(`${label} must declare exactly one range unit`);
  const unit = attribute(unitElements[0][1], "code", label);
  if (!unit || unit.length > 64) throw new Error(`${label} has an invalid range unit`);
  return { fieldName, unit };
}

function extentFromEnvelope(envelope: { attributes: string; body: string }, label: string) {
  const labels = attribute(envelope.attributes, "axisLabels", label).trim().split(/\s+/);
  const units = attribute(envelope.attributes, "uomLabels", label).trim().split(/\s+/);
  const requiredUnits = {
    long: "deg",
    lat: "deg",
    height: "m",
    time: "ISO8601",
  } as const;
  if (labels.length === 0 || labels.length !== units.length ||
    Object.entries(requiredUnits).some(([axis, expectedUnit]) => {
      const index = labels.indexOf(axis);
      return index < 0 || units[index] !== expectedUnit;
    })) {
    throw new Error(`${label} envelope does not use the required dimension units`);
  }
  const lower = parseNumberList(firstText(envelope.body, "lowerCorner", label), `${label} lower corner`);
  const upper = parseNumberList(firstText(envelope.body, "upperCorner", label), `${label} upper corner`);
  const longitudeIndex = labels.indexOf("long");
  const latitudeIndex = labels.indexOf("lat");
  if (longitudeIndex < 0 || latitudeIndex < 0 ||
    !Number.isFinite(lower[longitudeIndex]) || !Number.isFinite(upper[longitudeIndex]) ||
    !Number.isFinite(lower[latitudeIndex]) || !Number.isFinite(upper[latitudeIndex])) {
    throw new Error(`${label} envelope does not contain longitude and latitude bounds`);
  }
  return {
    labels,
    extent: {
      minLatitude: Math.min(lower[latitudeIndex], upper[latitudeIndex]),
      maxLatitude: Math.max(lower[latitudeIndex], upper[latitudeIndex]),
      minLongitude: Math.min(lower[longitudeIndex], upper[longitudeIndex]),
      maxLongitude: Math.max(lower[longitudeIndex], upper[longitudeIndex]),
    },
  };
}

export function parseAromeCoverageDescription(
  xmlInput: string,
  expectedSelection?: AromeCoverageSelection,
): AromeCoverageDescription {
  const label = "AROME DescribeCoverage";
  const xml = assertSafeXml(xmlInput, label);
  if (!new RegExp(`<${XML_NAME_PREFIX}CoverageDescriptions\\b`, "i").test(xml)) {
    throw new Error(`${label} XML has an unexpected root element`);
  }
  const description = firstElement(xml, "CoverageDescription", label);
  const coverageId = firstText(description.body, "CoverageId", label);
  const parsedSelection = selectionFromCoverageId(coverageId);
  if (expectedSelection && (
    expectedSelection.coverageId !== coverageId ||
    expectedSelection.variable !== parsedSelection.variable ||
    expectedSelection.runAt !== parsedSelection.runAt
  )) {
    throw new Error("AROME DescribeCoverage does not match the requested coverage");
  }
  const selection: AromeCoverageSelection = {
    ...parsedSelection,
    provenance: AROME_DIRECT_PROVENANCE,
  };

  const domain = firstElement(description.body, "domainSet", label);
  const grid = firstElement(domain.body, "ReferenceableGridByVectors", label);
  const axes = parseAxes(grid.body, label);
  const gridLabels = firstText(grid.body, "axisLabels", label).split(/\s+/);
  if (!["long", "lat", "height", "time"].every((axis) => gridLabels.includes(axis))) {
    throw new Error(`${label} grid does not declare the required axes`);
  }
  const nativeGrid = assertNativeGrid(axes, label);
  const levelAxis = axes[selection.level.axis];
  if (!levelAxis || levelAxis.unit !== "m") {
    throw new Error(`AROME ${selection.variable} coverage height axis must use metres`);
  }
  if (!levelAxis.coefficients.includes(selection.level.value)) {
    throw new Error(`AROME ${selection.variable} coverage does not provide its required level`);
  }
  const timeAxis = axes.time;
  if (!timeAxis || timeAxis.unit !== "s" || timeAxis.coefficients.length === 0 ||
    timeAxis.coefficients.some((seconds) => !Number.isInteger(seconds) || seconds < 0)) {
    throw new Error("AROME coverage has invalid forecast lead-time coefficients");
  }
  const availableLeadSeconds = [...timeAxis.coefficients];
  if (availableLeadSeconds.some((seconds, index) =>
    index > 0 && seconds <= availableLeadSeconds[index - 1]
  )) {
    throw new Error("AROME forecast lead-time coefficients must be strictly increasing");
  }

  const boundedBy = firstElement(description.body, "boundedBy", label);
  const envelopeMatches = elements(boundedBy.body, "EnvelopeWithTimePeriod");
  const envelope = envelopeMatches.length === 1
    ? envelopeMatches[0]
    : firstElement(boundedBy.body, "Envelope", label);
  const { extent } = extentFromEnvelope(envelope, label);
  const validFrom = canonicalInstant(firstText(envelope.body, "beginPosition", label), "AROME validFrom");
  const validUntil = canonicalInstant(firstText(envelope.body, "endPosition", label), "AROME validUntil");
  if (Date.parse(validFrom) > Date.parse(validUntil)) throw new Error("AROME valid-time extent is inverted");
  const firstLeadAt = Date.parse(selection.runAt) + availableLeadSeconds[0] * 1000;
  const lastLeadAt = Date.parse(selection.runAt) + availableLeadSeconds.at(-1)! * 1000;
  if (Date.parse(validFrom) !== firstLeadAt || Date.parse(validUntil) !== lastLeadAt) {
    throw new Error("AROME valid-time extent does not match its forecast lead coefficients");
  }

  const rangeType = firstElement(description.body, "rangeType", label);
  const value = rangeValue(rangeType.body, label);
  const coverageSpec = COVERAGE_SPECS[selection.variable];
  if (value.fieldName !== coverageSpec.coveragePrefix || value.unit !== coverageSpec.rangeUnit) {
    throw new Error(`AROME ${selection.variable} coverage range field or unit has drifted`);
  }
  return {
    ...selection,
    axes,
    level: {
      ...selection.level,
      unit: levelAxis.unit,
      availableValues: [...levelAxis.coefficients],
    },
    availableLeadSeconds,
    validFrom,
    validUntil,
    value,
    extent,
    nativeGrid,
  };
}

function boundedNumber(value: number, min: number, max: number, label: string) {
  if (!Number.isFinite(value) || value < min || value > max) throw new RangeError(`${label} is outside its valid range`);
  return value;
}

function normalizeBounds(bounds: AromeCoverageBounds, extent: AromeCoverageBounds) {
  const normalized = {
    minLatitude: boundedNumber(bounds.minLatitude, -90, 90, "minimum latitude"),
    maxLatitude: boundedNumber(bounds.maxLatitude, -90, 90, "maximum latitude"),
    minLongitude: boundedNumber(bounds.minLongitude, -180, 180, "minimum longitude"),
    maxLongitude: boundedNumber(bounds.maxLongitude, -180, 180, "maximum longitude"),
  };
  if (normalized.minLatitude >= normalized.maxLatitude || normalized.minLongitude >= normalized.maxLongitude) {
    throw new RangeError("AROME coverage bounds must have increasing latitude and longitude limits");
  }
  if (normalized.minLatitude < extent.minLatitude || normalized.maxLatitude > extent.maxLatitude ||
    normalized.minLongitude < extent.minLongitude || normalized.maxLongitude > extent.maxLongitude) {
    throw new RangeError("AROME coverage bounds exceed the described coverage extent");
  }
  return normalized;
}

function subsetNumber(value: number) {
  return Number.isInteger(value) ? value.toFixed(1) : String(value);
}

function levelSubsetNumber(value: number) {
  return String(value);
}

export function buildAromeGetCoverageRequest(
  description: AromeCoverageDescription,
  input: {
    validAt: string;
    bounds: AromeCoverageBounds;
    format?: "application/wmo-grib" | "image/tiff";
  },
): AromeCoverageRequest {
  const parsed = selectionFromCoverageId(description.coverageId);
  if (parsed.variable !== description.variable || parsed.runAt !== description.runAt) {
    throw new Error("AROME coverage description metadata does not match its coverage ID");
  }
  const validAt = canonicalInstant(input.validAt, "AROME requested valid time");
  const leadSeconds = (Date.parse(validAt) - Date.parse(description.runAt)) / 1000;
  if (!Number.isInteger(leadSeconds) || !description.availableLeadSeconds.includes(leadSeconds)) {
    throw new RangeError("AROME requested valid time is not an available forecast lead");
  }
  if (Date.parse(validAt) < Date.parse(description.validFrom) ||
    Date.parse(validAt) > Date.parse(description.validUntil)) {
    throw new RangeError("AROME requested valid time is outside the described time extent");
  }
  if (!description.level.availableValues.includes(description.level.value)) {
    throw new Error(`AROME ${description.variable} required level is unavailable`);
  }
  const bounds = normalizeBounds(input.bounds, description.extent);
  const url = new URL(`${AROME_DIRECT_WCS_BASE_URL}/GetCoverage`);
  url.searchParams.set("service", "WCS");
  url.searchParams.set("version", AROME_DIRECT_WCS_VERSION);
  url.searchParams.set("coverageid", description.coverageId);
  url.searchParams.append("subset", `time(${validAt.replace(".000Z", "Z")})`);
  const format = input.format ?? "application/wmo-grib";
  url.searchParams.append(
    "subset",
    `${description.level.axis}(${levelSubsetNumber(description.level.value)})`,
  );
  url.searchParams.append(
    "subset",
    `lat(${subsetNumber(bounds.minLatitude)},${subsetNumber(bounds.maxLatitude)})`,
  );
  url.searchParams.append(
    "subset",
    `long(${subsetNumber(bounds.minLongitude)},${subsetNumber(bounds.maxLongitude)})`,
  );
  url.searchParams.set("format", format);
  const coverageSpec = COVERAGE_SPECS[description.variable];
  return {
    url,
    metadata: {
      variable: description.variable,
      coverageId: description.coverageId,
      runAt: description.runAt,
      validAt,
      leadSeconds,
      level: {
        axis: description.level.axis,
        value: description.level.value,
        unit: description.level.unit,
      },
      valueUnit: description.value.unit,
      transport: format === "image/tiff"
        ? {
          format,
          valueUnit: coverageSpec.tiffValueUnit,
          scaleToDeclaredUnit: 1,
          offsetToDeclaredUnit: coverageSpec.tiffOffsetToRangeUnit,
        }
        : {
          format,
          valueUnit: description.value.unit,
          scaleToDeclaredUnit: 1,
          offsetToDeclaredUnit: 0,
        },
      bounds,
      provenance: AROME_DIRECT_PROVENANCE,
    },
  };
}

export function sanitizeAromeError(error: unknown) {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown provider error";
  return raw
    .replace(
      /\bauthorization\s*[:=]\s*Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi,
      "Authorization: Bearer [redacted]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [redacted]")
    .replace(/\b(access[_-]?token|api[_-]?key|apikey|client[_-]?secret|token)\s*[:=]\s*[^\s,;]+/gi, "$1=[redacted]")
    .replace(/https?:\/\/[^\s"'<>]+/gi, (candidate) => {
      try {
        const url = new URL(candidate);
        url.search = "";
        url.hash = "";
        return url.toString();
      } catch {
        return "[redacted-url]";
      }
    })
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 300);
}
