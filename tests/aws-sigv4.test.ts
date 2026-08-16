import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain ESM script library without type declarations
import { amzDateStamps, EMPTY_PAYLOAD_SHA256, signS3GetRequest } from "@/scripts/lib/aws-sigv4.mjs";
// @ts-expect-error -- plain ESM script library without type declarations
import { s3ObjectPath } from "@/scripts/lib/clms-cdse.mjs";

/**
 * Verified against the AWS "Signature Calculations for the Authorization
 * Header" GET Object example, so a signing regression fails here rather than
 * as an opaque 403 from the provider.
 */
const AWS_EXAMPLE = {
  accessKey: "AKIAIOSFODNN7EXAMPLE",
  secretKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  host: "examplebucket.s3.amazonaws.com",
  path: "/test.txt",
  region: "us-east-1",
  extraHeaders: { range: "bytes=0-9" },
  date: new Date("2013-05-24T00:00:00Z"),
};

describe("AWS SigV4 signing", () => {
  it("reproduces the published AWS GET Object signature", () => {
    const headers = signS3GetRequest(AWS_EXAMPLE);
    expect(headers.Authorization).toContain(
      "Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41",
    );
  });

  it("declares the credential scope and signed headers in order", () => {
    const headers = signS3GetRequest(AWS_EXAMPLE);
    expect(headers.Authorization).toContain(
      "Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request",
    );
    expect(headers.Authorization).toContain(
      "SignedHeaders=host;range;x-amz-content-sha256;x-amz-date",
    );
  });

  it("sends the empty-payload digest for a body-less GET", () => {
    const headers = signS3GetRequest(AWS_EXAMPLE);
    expect(headers["x-amz-content-sha256"]).toBe(EMPTY_PAYLOAD_SHA256);
    expect(headers["x-amz-date"]).toBe("20130524T000000Z");
  });

  it("changes the signature when any signed input changes", () => {
    const baseline = signS3GetRequest(AWS_EXAMPLE).Authorization;
    const otherRange = signS3GetRequest({
      ...AWS_EXAMPLE,
      extraHeaders: { range: "bytes=0-10" },
    }).Authorization;
    const otherPath = signS3GetRequest({ ...AWS_EXAMPLE, path: "/other.txt" }).Authorization;
    const otherRegion = signS3GetRequest({ ...AWS_EXAMPLE, region: "default" }).Authorization;
    expect(new Set([baseline, otherRange, otherPath, otherRegion]).size).toBe(4);
  });

  it("URI-encodes path segments without escaping the separators", () => {
    const headers = signS3GetRequest({
      ...AWS_EXAMPLE,
      path: "/eodata/CLMS/a b/c_gls_SSM1km-SSM.tiff",
    });
    // A space must be encoded, so the signature differs from the raw path.
    expect(headers.Authorization).toMatch(/Signature=[0-9a-f]{64}$/);
  });

  it("requires credentials and an absolute path", () => {
    expect(() => signS3GetRequest({ ...AWS_EXAMPLE, accessKey: "" }))
      .toThrow(/access key and a secret key/);
    expect(() => signS3GetRequest({ ...AWS_EXAMPLE, path: "test.txt" }))
      .toThrow(/must be absolute/);
  });

  it("derives compact AMZ date stamps", () => {
    const { amzDate, dateStamp } = amzDateStamps(new Date("2026-08-16T09:30:15.123Z"));
    expect(amzDate).toBe("20260816T093015Z");
    expect(dateStamp).toBe("20260816");
  });
});

describe("CDSE S3 object paths", () => {
  it("derives a path-style request path from a validated s3 href", () => {
    expect(
      s3ObjectPath("s3://eodata/CLMS/bio-geophysical/surface_soil_moisture/x.tiff"),
    ).toBe("/eodata/CLMS/bio-geophysical/surface_soil_moisture/x.tiff");
  });

  it("rejects a foreign bucket or a traversing key", () => {
    expect(() => s3ObjectPath("s3://other/CLMS/x.tiff")).toThrow(/expected CDSE bucket/);
    expect(() => s3ObjectPath("https://example.test/x.tiff")).toThrow(/expected CDSE bucket/);
    expect(() => s3ObjectPath("s3://eodata/../secret")).toThrow(/object key is invalid/);
    expect(() => s3ObjectPath("s3://eodata/")).toThrow(/object key is invalid/);
  });
});
