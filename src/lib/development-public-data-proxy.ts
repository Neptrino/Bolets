import "server-only";

interface PublicDataEnvironment {
  NODE_ENV?: string;
  BOLETS_DEV_PUBLIC_DATA_ORIGIN?: string;
}

const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "if-modified-since",
  "if-none-match",
] as const;

const FORWARDED_RESPONSE_HEADERS = [
  "cache-control",
  "content-type",
  "etag",
  "last-modified",
  "vary",
] as const;

function developmentPublicDataOrigin(environment: PublicDataEnvironment) {
  if (environment.NODE_ENV !== "development") return null;
  const configured = environment.BOLETS_DEV_PUBLIC_DATA_ORIGIN?.trim();
  if (!configured) return null;

  const url = new URL(configured);
  const localHttp = url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !localHttp) {
    throw new Error("Development public data origin must use HTTPS or local HTTP");
  }
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Development public data origin must be a bare origin");
  }
  return url.origin;
}

function configurationError() {
  return Response.json(
    { error: "Development public data origin is invalid" },
    { status: 500 },
  );
}

function unavailableResponse() {
  return Response.json(
    { error: "Production public data is temporarily unavailable" },
    { status: 502 },
  );
}

/**
 * Let a local Next.js dev server read the deployed public map API without
 * pointing any local authentication, admin or mutation route at production.
 * The browser keeps using the canonical same-origin bucket URL, which also
 * preserves the cache identity shared by live and downloaded maps.
 */
export async function proxyDevelopmentPublicDataGet(
  request: Request,
  pathname: "/api/predictions" | "/api/habitat",
  environment: PublicDataEnvironment = process.env,
) {
  let origin: string | null;
  try {
    origin = developmentPublicDataOrigin(environment);
  } catch {
    return configurationError();
  }
  if (!origin) return null;

  const incomingUrl = new URL(request.url);
  if (incomingUrl.origin === origin) return null;
  const upstreamUrl = new URL(pathname, `${origin}/`);
  upstreamUrl.search = incomingUrl.search;

  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      headers,
      redirect: "error",
      signal: AbortSignal.any([
        request.signal,
        AbortSignal.timeout(15_000),
      ]),
    });
    const responseHeaders = new Headers();
    for (const name of FORWARDED_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("x-bolets-data-source", "production-public-api");
    return new Response(upstream.body, {
      headers: responseHeaders,
      status: upstream.status,
      statusText: upstream.statusText,
    });
  } catch {
    return unavailableResponse();
  }
}
