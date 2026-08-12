const COMPRESSION_THRESHOLD_BYTES = 1_024;

function acceptsGzip(request: Request) {
  return (request.headers.get("accept-encoding") ?? "")
    .split(",")
    .some((entry) => {
      const [encoding, ...parameters] = entry.trim().toLowerCase().split(";");
      if (encoding !== "gzip") return false;
      return !parameters.some((parameter) =>
        /^q=0(?:\.0*)?$/.test(parameter.trim()),
      );
    });
}

/**
 * Route Handler JSON is not compressed by `next start` in every deployment
 * target. Negotiate gzip for material payloads and keep cache variants safe.
 */
export function jsonResponse(
  request: Request,
  value: unknown,
  init: ResponseInit = {},
) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.append("Vary", "Accept-Encoding");

  if (!acceptsGzip(request) || bytes.byteLength < COMPRESSION_THRESHOLD_BYTES)
    return new Response(bytes, { ...init, headers });

  headers.set("Content-Encoding", "gzip");
  const body = new Blob([bytes])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new Response(body, { ...init, headers });
}
