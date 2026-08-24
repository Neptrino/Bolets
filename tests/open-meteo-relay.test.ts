import { describe, expect, it, vi } from "vitest";
import {
  createRelaySignature,
  handleRelayRequest,
} from "@/workers/open-meteo-relay/src/index";

const secret = "test-relay-secret-with-enough-entropy";
const now = Date.parse("2026-08-24T08:00:00Z");
const timestamp = String(Math.floor(now / 1_000));
const upstreamUrl = new URL("https://api.open-meteo.com/v1/meteofrance");
upstreamUrl.searchParams.set("latitude", "41.1,42.2");
upstreamUrl.searchParams.set("longitude", "1.2,2.3");
upstreamUrl.searchParams.set("past_hours", "72");
upstreamUrl.searchParams.set("forecast_hours", "1");
upstreamUrl.searchParams.set("hourly", "temperature_2m,precipitation");
upstreamUrl.searchParams.set("models", "arome_france");

async function signedRequest(rawUrl = upstreamUrl.toString(), requestTimestamp = timestamp) {
  const signature = await createRelaySignature(secret, requestTimestamp, rawUrl);
  return new Request("https://relay.example/v1/fetch", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Bolets-Relay-Timestamp": requestTimestamp,
      "X-Bolets-Relay-Signature": signature,
    },
    body: JSON.stringify({ url: rawUrl }),
  });
}

describe("Open-Meteo Cloudflare relay", () => {
  it("exposes only a non-cacheable health response without credentials", async () => {
    const response = await handleRelayRequest(
      new Request("https://relay.example/health"),
      { RELAY_HMAC_SECRET: secret },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ ok: true });
  });

  it("rejects stale signatures before making an upstream request", async () => {
    const fetcher = vi.fn();
    const staleTimestamp = String(Number(timestamp) - 121);
    const response = await handleRelayRequest(
      await signedRequest(upstreamUrl.toString(), staleTimestamp),
      { RELAY_HMAC_SECRET: secret },
      { fetcher: fetcher as typeof fetch, now: () => now },
    );
    expect(response.status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a validly signed request to any non-Open-Meteo host", async () => {
    const fetcher = vi.fn();
    const forbidden = "https://example.com/v1/meteofrance?latitude=41&longitude=2";
    const response = await handleRelayRequest(
      await signedRequest(forbidden),
      { RELAY_HMAC_SECRET: secret },
      { fetcher: fetcher as typeof fetch, now: () => now },
    );
    expect(response.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("streams one allowlisted request and does not cache its response", async () => {
    const fetcher = vi.fn(async () => Response.json([{ latitude: 41.1 }], {
      headers: { "Retry-After": "30" },
    }));
    const response = await handleRelayRequest(
      await signedRequest(),
      { RELAY_HMAC_SECRET: secret },
      { fetcher: fetcher as typeof fetch, now: () => now },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-bolets-egress")).toBe("cloudflare");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("30");
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual([{ latitude: 41.1 }]);
  });

  it("does not follow an upstream redirect outside the allowlist", async () => {
    const fetcher = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { Location: "https://example.com/private" },
    }));
    const response = await handleRelayRequest(
      await signedRequest(),
      { RELAY_HMAC_SECRET: secret },
      { fetcher: fetcher as typeof fetch, now: () => now },
    );
    expect(response.status).toBe(502);
    expect(response.headers.has("location")).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
