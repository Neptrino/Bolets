import {
  handleRelayRequest,
  type RelayDependencies,
} from "../../../workers/open-meteo-relay/src/index";

const MAX_BUFFERED_RESPONSE_BYTES = 5_500_000;

export type LambdaFunctionUrlEvent = {
  body?: string | null;
  headers: Record<string, string | undefined>;
  isBase64Encoded?: boolean;
  rawPath: string;
  rawQueryString?: string;
  requestContext: {
    http: {
      method: string;
    };
  };
};

export type LambdaFunctionUrlResult = {
  body: string;
  headers: Record<string, string>;
  isBase64Encoded: boolean;
  statusCode: number;
};

type LambdaRelayDependencies = RelayDependencies & {
  secret?: string;
};

function eventRequest(event: LambdaFunctionUrlEvent) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(event.headers)) {
    if (value !== undefined && name.toLowerCase() !== "host") headers.set(name, value);
  }
  const host = event.headers.host ?? event.headers.Host ?? "lambda.invalid";
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";
  const method = event.requestContext.http.method.toUpperCase();
  const body = event.body === null || event.body === undefined || method === "GET" || method === "HEAD"
    ? undefined
    : event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body;
  return new Request(`https://${host}${event.rawPath}${query}`, {
    method,
    headers,
    body,
  });
}

function lambdaJson(error: string, statusCode: number): LambdaFunctionUrlResult {
  return {
    statusCode,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json",
      "x-content-type-options": "nosniff",
    },
    body: Buffer.from(JSON.stringify({ error })).toString("base64"),
    isBase64Encoded: true,
  };
}

export async function handleLambdaEvent(
  event: LambdaFunctionUrlEvent,
  dependencies: LambdaRelayDependencies = {},
): Promise<LambdaFunctionUrlResult> {
  const secret = dependencies.secret ?? process.env.RELAY_HMAC_SECRET;
  if (!secret) return lambdaJson("Relay is not configured", 503);

  try {
    const response = await handleRelayRequest(
      eventRequest(event),
      { RELAY_HMAC_SECRET: secret },
      { ...dependencies, egress: "aws" },
    );
    const body = Buffer.from(await response.arrayBuffer());
    if (body.byteLength > MAX_BUFFERED_RESPONSE_BYTES) {
      console.error(JSON.stringify({
        message: "Open-Meteo Lambda relay response exceeded the Function URL limit",
        responseBytes: body.byteLength,
      }));
      return lambdaJson("Upstream response is too large", 502);
    }
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: body.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    console.error(JSON.stringify({
      message: "Open-Meteo Lambda relay adapter failed",
      error: error instanceof Error ? error.message : "Unknown relay error",
    }));
    return lambdaJson("Relay request failed", 500);
  }
}

export async function handler(event: LambdaFunctionUrlEvent) {
  return handleLambdaEvent(event);
}
