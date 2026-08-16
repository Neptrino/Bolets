import { createHash, createHmac } from "node:crypto";

/**
 * Minimal AWS Signature Version 4 signer for authenticated S3 GET requests.
 *
 * CDSE serves its product archive through an S3-compatible endpoint and does
 * not accept OAuth client-credentials tokens on the download service, so
 * fetching a raster means signing the request. Only the single-chunk unsigned
 * payload case is needed here, which keeps this to the canonical request, the
 * string to sign, and the derived signing key.
 */

export const EMPTY_PAYLOAD_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key, value) {
  return createHmac("sha256", key).update(value).digest();
}

/** Each path segment is URI-encoded, but the separators are preserved. */
function encodeS3Path(path) {
  return path
    .split("/")
    .map((segment) =>
      encodeURIComponent(segment).replace(
        /[!'()*]/g,
        (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
      )
    )
    .join("/");
}

export function amzDateStamps(date) {
  const stamp = date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return { amzDate: stamp, dateStamp: stamp.slice(0, 8) };
}

function signingKey(secretKey, dateStamp, region, service) {
  const dateKey = hmac(`AWS4${secretKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  return hmac(serviceKey, "aws4_request");
}

/**
 * Returns the headers that authorise a GET against an S3-compatible endpoint.
 * `path` must already include the bucket when the endpoint uses path-style
 * addressing, which CDSE does.
 */
export function signS3GetRequest({
  accessKey,
  secretKey,
  host,
  path,
  region = "default",
  service = "s3",
  extraHeaders = {},
  payloadSha256 = EMPTY_PAYLOAD_SHA256,
  date = new Date(),
}) {
  if (!accessKey || !secretKey) {
    throw new Error("S3 request signing requires an access key and a secret key");
  }
  if (!path.startsWith("/")) throw new Error("S3 request path must be absolute");

  const { amzDate, dateStamp } = amzDateStamps(date);
  const headers = {
    host,
    "x-amz-content-sha256": payloadSha256,
    "x-amz-date": amzDate,
    ...Object.fromEntries(
      Object.entries(extraHeaders).map(([name, value]) => [name.toLowerCase(), value]),
    ),
  };

  const signedHeaderNames = Object.keys(headers).sort();
  const canonicalHeaders = signedHeaderNames
    .map((name) => `${name}:${String(headers[name]).trim()}\n`)
    .join("");
  const signedHeaders = signedHeaderNames.join(";");
  const canonicalRequest = [
    "GET",
    encodeS3Path(path),
    "",
    canonicalHeaders,
    signedHeaders,
    payloadSha256,
  ].join("\n");

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signature = createHmac(
    "sha256",
    signingKey(secretKey, dateStamp, region, service),
  ).update(stringToSign).digest("hex");

  return {
    ...headers,
    Authorization:
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}
