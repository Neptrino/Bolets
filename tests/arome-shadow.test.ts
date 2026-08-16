import { describe, expect, it, vi } from "vitest";
import { buildAromeCapabilitiesUrl } from "@/supabase/functions/_shared/arome-direct";
import {
  AROME_SHADOW_MAX_XML_BYTES,
  CATALONIA_AROME_SCOPE,
  buildAromeShadowObjectPath,
  decodeAromeShadowXml,
  fetchAromeShadowResource,
  normalizeAromeShadowBounds,
  normalizeAromeShadowRequest,
  selectAromeShadowValidAt,
  sha256Hex,
  validateSingleAromeShadowGrib2Container,
} from "@/supabase/functions/_shared/arome-shadow";

function grib2(length = 24) {
  const bytes = new Uint8Array(length);
  bytes.set([0x47, 0x52, 0x49, 0x42], 0);
  bytes[7] = 2;
  let remaining = BigInt(length);
  for (let index = 15; index >= 8; index -= 1) {
    bytes[index] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  bytes.set([0x37, 0x37, 0x37, 0x37], length - 4);
  return bytes;
}

describe("direct AROME shadow boundary", () => {
  it("accepts one supported field and snaps a small subset to the native grid", () => {
    expect(normalizeAromeShadowRequest({
      action: "stage",
      variable: "temperature_2m",
      runAt: "2026-08-15T03:00:00Z",
      bounds: {
        minLatitude: 41.501,
        maxLatitude: 41.549,
        minLongitude: 1.501,
        maxLongitude: 1.549,
      },
    })).toEqual({
      action: "stage",
      variable: "temperature_2m",
      runAt: "2026-08-15T03:00:00.000Z",
      bounds: {
        minLatitude: 41.5,
        maxLatitude: 41.55,
        minLongitude: 1.5,
        maxLongitude: 1.55,
      },
    });
  });

  it("fails closed outside Catalonia or above the bounded subset size", () => {
    expect(() => normalizeAromeShadowBounds({
      ...CATALONIA_AROME_SCOPE,
      minLongitude: CATALONIA_AROME_SCOPE.minLongitude - 0.01,
    })).toThrow(/fixed Catalonia scope/);
    expect(() => normalizeAromeShadowBounds({
      minLatitude: 41,
      maxLatitude: 41.26,
      minLongitude: 1,
      maxLongitude: 1.1,
    })).toThrow(/at most 0.25 degrees/);
    expect(() => normalizeAromeShadowRequest({
      action: "stage",
      variable: "precipitation",
      bounds: {
        minLatitude: 41,
        maxLatitude: 41.1,
        minLongitude: 1,
        maxLongitude: 1.1,
      },
    })).toThrow(/variable is unsupported/);
  });

  it("keeps metadata probes location-free and rejects extra request fields", () => {
    expect(normalizeAromeShadowRequest({
      variable: "relative_humidity_2m",
    })).toEqual({ action: "probe", variable: "relative_humidity_2m" });
    expect(() => normalizeAromeShadowRequest({
      action: "probe",
      variable: "relative_humidity_2m",
      bounds: {
        minLatitude: 41,
        maxLatitude: 41.1,
        minLongitude: 1,
        maxLongitude: 1.1,
      },
    })).toThrow(/do not accept validAt or bounds/);
    expect(() => normalizeAromeShadowRequest({
      action: "probe",
      variable: "wind_speed_10m",
      providerToken: "must-never-be-accepted",
    })).toThrow(/unsupported fields/);
  });

  it("selects the latest available non-future lead when validAt is omitted", () => {
    expect(selectAromeShadowValidAt({
      runAt: "2026-08-15T03:00:00.000Z",
      availableLeadSeconds: [0, 3600, 7200, 10_800],
    }, undefined, new Date("2026-08-15T05:30:00Z"))).toBe("2026-08-15T05:00:00.000Z");
    expect(() => selectAromeShadowValidAt({
      runAt: "2026-08-15T06:00:00.000Z",
      availableLeadSeconds: [0, 3600],
    }, undefined, new Date("2026-08-15T05:30:00Z"))).toThrow(/no available non-future lead/);
    expect(selectAromeShadowValidAt({
      runAt: "2026-08-15T06:00:00.000Z",
      availableLeadSeconds: [0, 3600],
    }, "2026-08-15T07:00:00Z", new Date("2026-08-15T05:30:00Z"))).toBe(
      "2026-08-15T07:00:00.000Z",
    );
  });

  it("sends the server credential only in the provider Authorization header", async () => {
    const credential = "header.payload.signature";
    const fetchImpl = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("authorization")).toBe(`Bearer ${credential}`);
      expect(init?.redirect).toBe("error");
      expect(init?.referrerPolicy).toBe("no-referrer");
      return new Response("<wcs:Capabilities/>", {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      });
    });
    const response = await fetchAromeShadowResource(
      buildAromeCapabilitiesUrl(),
      credential,
      { fetchImpl },
    );
    expect(decodeAromeShadowXml(response.bytes)).toBe("<wcs:Capabilities/>");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("rejects oversized responses while streaming instead of buffering them", async () => {
    const fetchImpl = vi.fn(async () => new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(6));
        controller.enqueue(new Uint8Array(6));
        controller.close();
      },
    }), { status: 200 }));
    await expect(fetchAromeShadowResource(
      buildAromeCapabilitiesUrl(),
      "header.payload.signature",
      { fetchImpl, maximumBytes: 10 },
    )).rejects.toThrow(/size limit/);
    await expect(fetchAromeShadowResource(
      buildAromeCapabilitiesUrl(),
      "header.payload.signature",
      { maximumBytes: AROME_SHADOW_MAX_XML_BYTES + 1 },
    )).rejects.toThrow(/limits are invalid/);
  });

  it("accepts exactly one GRIB2 container without claiming semantic validation", async () => {
    const first = grib2();
    expect(validateSingleAromeShadowGrib2Container(first)).toEqual({ messages: 1, bytes: 24 });
    const second = grib2(28);
    const payload = new Uint8Array(first.byteLength + second.byteLength);
    payload.set(first);
    payload.set(second, first.byteLength);
    expect(() => validateSingleAromeShadowGrib2Container(payload)).toThrow(/exactly one GRIB2 message/);
    const digest = await sha256Hex(first);
    const path = buildAromeShadowObjectPath({
      variable: "wind_speed_10m",
      runAt: "2026-08-15T03:00:00Z",
      validAt: "2026-08-15T05:00:00Z",
      sha256: digest,
    });
    expect(path).toMatch(/^arome-shadow-v1\/20260815T030000Z\/20260815T050000Z\/wind_speed_10m\/[a-f0-9]{32}\.grib2$/);
    expect(path).not.toContain("41.5");
    expect(path).not.toContain("1.5");

    const invalid = grib2();
    invalid[invalid.byteLength - 1] = 0;
    expect(() => validateSingleAromeShadowGrib2Container(invalid)).toThrow(/invalid GRIB2 message/);
  });
});
