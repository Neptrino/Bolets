import {
  buildAromeCapabilitiesUrl,
  buildAromeDescribeCoverageUrl,
  buildAromeGetCoverageRequest,
  parseAromeCapabilities,
  parseAromeCoverageDescription,
  sanitizeAromeError,
} from "../_shared/arome-direct.ts";
import {
  AROME_SHADOW_BUCKET,
  AROME_SHADOW_MAX_OBJECT_BYTES,
  AROME_SHADOW_MAX_XML_BYTES,
  AROME_SHADOW_SCHEMA,
  aromeShadowDescriptionSummary,
  buildAromeShadowObjectPath,
  decodeAromeShadowXml,
  fetchAromeShadowResource,
  normalizeAromeShadowRequest,
  selectAromeShadowValidAt,
  sha256Hex,
  validateSingleAromeShadowGrib2Container,
} from "../_shared/arome-shadow.ts";
import {
  createAdminClient,
  finishRun,
  json,
  startRun,
  verifyNamedToken,
} from "../_shared/pipeline.ts";

const SOURCE_ID = "meteofrance-arome-direct-shadow";
const MAX_REQUEST_BYTES = 4 * 1024;

class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function boundedJson(request: Request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    throw new RequestError("AROME shadow request is too large", 413);
  }
  if (!request.body) throw new RequestError("AROME shadow request body is required", 400);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new RequestError("AROME shadow request is too large", 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestError("AROME shadow request must be valid JSON", 400);
  }
}

async function updateSourceState(
  supabase: ReturnType<typeof createAdminClient>,
  status: "blocked" | "degraded",
  detail: string,
) {
  const checkedAt = new Date().toISOString();
  const { error } = await supabase
    .from("pipeline_sources")
    .update({
      status,
      status_detail: detail.slice(0, 500),
      checked_at: checkedAt,
      updated_at: checkedAt,
    })
    .eq("source_id", SOURCE_ID);
  if (error) {
    console.error("Unable to update direct AROME shadow source state", {
      message: sanitizeAromeError(error),
    });
    return false;
  }
  return true;
}

function storageMetadata(input: {
  variable: string;
  coverageId: string;
  runAt: string;
  validAt: string;
  valueUnit: string;
  levelAxis: string;
  levelValue: number;
  levelUnit: string;
  bounds: Record<string, number>;
  sha256: string;
  bytes: number;
  messages: number;
}) {
  return {
    schema: AROME_SHADOW_SCHEMA,
    scoring_enabled: "false",
    provider: "Météo-France",
    model: "AROME",
    variable: input.variable,
    coverage_id: input.coverageId,
    run_at: input.runAt,
    valid_at: input.validAt,
    value_unit: input.valueUnit,
    level: `${input.levelAxis}:${input.levelValue}:${input.levelUnit}`,
    bounds: JSON.stringify(input.bounds),
    sha256: input.sha256,
    bytes: String(input.bytes),
    grib_messages: String(input.messages),
    native_angular_resolution_degrees: "0.01",
    container_validation: "grib2-single-message-framing-v1",
    semantic_verification: "pending",
  };
}

Deno.serve(async (request) => {
  let runId: string | undefined;
  let supabase: ReturnType<typeof createAdminClient> | undefined;
  try {
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, { Allow: "POST" });
    }
    supabase = createAdminClient();
    // The Edge gateway validates the caller's anon JWT first. The independent,
    // hashed staging token grants only this narrow maintenance operation; the
    // admin client and provider credential never leave the function.
    if (!await verifyNamedToken(
      request,
      supabase,
      "x-arome-shadow-stage-token",
      "arome-shadow-stage",
    )) {
      return json({ error: "Trusted AROME shadow staging authorization required" }, 403);
    }

    let input;
    try {
      input = normalizeAromeShadowRequest(await boundedJson(request));
    } catch (error) {
      if (error instanceof RequestError) return json({ error: error.message }, error.status);
      return json({ error: sanitizeAromeError(error) }, 400);
    }

    const providerCredential = Deno.env.get("METEOFRANCE_AROME_API_KEY");
    if (!providerCredential) {
      return json({ error: "Direct AROME server credential is not configured" }, 503);
    }
    const snapshotDate = new Date().toISOString().slice(0, 10);
    runId = await startRun(supabase, "spatial-atmosphere-shadow", "manual", snapshotDate, {
      schema: AROME_SHADOW_SCHEMA,
      action: input.action,
      variable: input.variable,
      scoringEnabled: false,
    });

    const capabilitiesResource = await fetchAromeShadowResource(
      buildAromeCapabilitiesUrl(),
      providerCredential,
      { maximumBytes: AROME_SHADOW_MAX_XML_BYTES },
    );
    const capabilities = parseAromeCapabilities(
      decodeAromeShadowXml(capabilitiesResource.bytes),
      input.runAt,
    );
    const selection = capabilities.coverages[input.variable];
    const descriptionResource = await fetchAromeShadowResource(
      buildAromeDescribeCoverageUrl(selection),
      providerCredential,
      { maximumBytes: AROME_SHADOW_MAX_XML_BYTES },
    );
    const description = parseAromeCoverageDescription(
      decodeAromeShadowXml(descriptionResource.bytes),
      selection,
    );
    const summary = aromeShadowDescriptionSummary(description);

    if (input.action === "probe") {
      const auditFinalized = await finishRun(supabase, runId, "succeeded", {
        rowsRead: 2,
        rowsWritten: 0,
        metadata: {
          schema: AROME_SHADOW_SCHEMA,
          action: "probe",
          variable: input.variable,
          runAt: description.runAt,
          scoringEnabled: false,
        },
      });
      if (!auditFinalized) {
        throw new Error("Unable to finalize direct AROME shadow probe audit");
      }
      const sourceBlocked = await updateSourceState(
        supabase,
        "blocked",
        "One direct AROME field description passed the metadata contract. The source remains blocked pending an all-three same-run smoke and decoded semantic verification.",
      );
      if (!sourceBlocked) throw new Error("Unable to retain blocked direct AROME source state");
      return json({
        action: "probe",
        staged: false,
        description: summary,
        sourceStatus: "blocked",
        semanticVerification: "pending",
      });
    }

    const validAt = selectAromeShadowValidAt(description, input.validAt);
    const coverageRequest = buildAromeGetCoverageRequest(description, {
      validAt,
      bounds: input.bounds!,
      format: "application/wmo-grib",
    });
    const coverageResource = await fetchAromeShadowResource(
      coverageRequest.url,
      providerCredential,
      { maximumBytes: AROME_SHADOW_MAX_OBJECT_BYTES },
    );
    const grib = validateSingleAromeShadowGrib2Container(coverageResource.bytes);
    const digest = await sha256Hex(coverageResource.bytes);
    const objectPath = buildAromeShadowObjectPath({
      variable: input.variable,
      runAt: coverageRequest.metadata.runAt,
      validAt: coverageRequest.metadata.validAt,
      sha256: digest,
    });
    const { error: uploadError } = await supabase.storage
      .from(AROME_SHADOW_BUCKET)
      .upload(objectPath, coverageResource.bytes, {
        contentType: "application/wmo-grib",
        cacheControl: "0",
        upsert: false,
        metadata: storageMetadata({
          variable: input.variable,
          coverageId: coverageRequest.metadata.coverageId,
          runAt: coverageRequest.metadata.runAt,
          validAt: coverageRequest.metadata.validAt,
          valueUnit: coverageRequest.metadata.valueUnit,
          levelAxis: coverageRequest.metadata.level.axis,
          levelValue: coverageRequest.metadata.level.value,
          levelUnit: coverageRequest.metadata.level.unit,
          bounds: coverageRequest.metadata.bounds,
          sha256: digest,
          bytes: grib.bytes,
          messages: grib.messages,
        }),
      });
    const alreadyStaged = uploadError?.statusCode === "409";
    if (uploadError && !alreadyStaged) {
      throw new Error(`Private AROME shadow upload failed (${uploadError.statusCode ?? "unknown"})`);
    }

    const auditFinalized = await finishRun(supabase, runId, "succeeded", {
      rowsRead: 3,
      rowsWritten: alreadyStaged ? 0 : 1,
      metadata: {
        schema: AROME_SHADOW_SCHEMA,
        action: "stage",
        variable: input.variable,
        coverageId: coverageRequest.metadata.coverageId,
        runAt: coverageRequest.metadata.runAt,
        validAt: coverageRequest.metadata.validAt,
        objectPath,
        sha256: digest,
        bytes: grib.bytes,
        alreadyStaged,
        containerValidation: "grib2-single-message-framing-v1",
        semanticVerification: "pending",
        scoringEnabled: false,
      },
    });
    if (!auditFinalized) {
      throw new Error(
        "AROME shadow object is private and recoverable, but audit finalization failed",
      );
    }
    const sourceBlocked = await updateSourceState(
      supabase,
      "blocked",
      "One bounded direct AROME response passed single-message GRIB2 container checks and was staged privately. Semantic verification and an all-three same-run smoke remain pending.",
    );
    if (!sourceBlocked) throw new Error("Unable to retain blocked direct AROME source state");
    return json({
      action: "stage",
      staged: !alreadyStaged,
      alreadyStaged,
      object: {
        bucket: AROME_SHADOW_BUCKET,
        path: objectPath,
        bytes: grib.bytes,
        sha256: digest,
      },
      request: coverageRequest.metadata,
      description: summary,
      sourceStatus: "blocked",
      verification: {
        transport: "https",
        container: "grib2-single-message-framing-v1",
        semantics: "pending",
      },
      scoringEnabled: false,
    }, alreadyStaged ? 200 : 201);
  } catch (error) {
    const message = sanitizeAromeError(error);
    if (supabase && runId) {
      await finishRun(supabase, runId, "failed", {
        errorMessage: message,
        metadata: { schema: AROME_SHADOW_SCHEMA, scoringEnabled: false },
      });
      await updateSourceState(
        supabase,
        "degraded",
        `Direct AROME shadow staging failed: ${message}`,
      );
    }
    console.error("Direct AROME shadow staging failed", { runId, message });
    return json({ error: "Direct AROME shadow staging failed", detail: message }, 502);
  }
});
