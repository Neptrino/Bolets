import { describe, expect, it, vi } from "vitest";
import {
  handleLambdaEvent,
  type LambdaFunctionUrlEvent,
} from "@/lambda/open-meteo-relay/src/handler";
import { createRelaySignature } from "@/workers/open-meteo-relay/src/index";

const secret = "test-aws-relay-secret-with-enough-entropy";
const now = Date.parse("2026-08-24T11:00:00Z");
const timestamp = String(Math.floor(now / 1_000));
const upstreamUrl = "https://api.open-meteo.com/v1/forecast?latitude=41.4&longitude=2.1&forecast_hours=1&hourly=temperature_2m";

function event(overrides: Partial<LambdaFunctionUrlEvent> = {}): LambdaFunctionUrlEvent {
  return {
    headers: { host: "relay.lambda-url.eu-south-2.on.aws" },
    rawPath: "/health",
    rawQueryString: "",
    requestContext: { http: { method: "GET" } },
    ...overrides,
  };
}

describe("Open-Meteo AWS Lambda relay", () => {
  it("adapts the public health response to the Function URL payload", async () => {
    const response = await handleLambdaEvent(event(), { secret });
    expect(response.statusCode).toBe(200);
    expect(response.isBase64Encoded).toBe(true);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(JSON.parse(Buffer.from(response.body, "base64").toString("utf8")))
      .toMatchObject({ ok: true });
  });

  it("rejects an unsigned provider request before fetching", async () => {
    const fetcher = vi.fn();
    const response = await handleLambdaEvent(event({
      rawPath: "/v1/fetch",
      requestContext: { http: { method: "POST" } },
      headers: {
        host: "relay.lambda-url.eu-south-2.on.aws",
        "content-type": "application/json",
      },
      body: JSON.stringify({ url: upstreamUrl }),
    }), { fetcher: fetcher as typeof fetch, now: () => now, secret });
    expect(response.statusCode).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("marks signed responses as AWS egress", async () => {
    const signature = await createRelaySignature(secret, timestamp, upstreamUrl);
    const fetcher = vi.fn(async () => Response.json([{ latitude: 41.4 }]));
    const response = await handleLambdaEvent(event({
      rawPath: "/v1/fetch",
      requestContext: { http: { method: "POST" } },
      headers: {
        host: "relay.lambda-url.eu-south-2.on.aws",
        "content-type": "application/json",
        "x-bolets-relay-signature": signature,
        "x-bolets-relay-timestamp": timestamp,
      },
      body: JSON.stringify({ url: upstreamUrl }),
    }), { fetcher: fetcher as typeof fetch, now: () => now, secret });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-bolets-egress"]).toBe("aws");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(Buffer.from(response.body, "base64").toString("utf8")))
      .toEqual([{ latitude: 41.4 }]);
  });
});
