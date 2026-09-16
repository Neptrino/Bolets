import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const db = vi.hoisted(() => ({ answer: null as string | null, fail: false, inserts: 0 }));
const limit = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/src/lib/abuse-rate-limit.server", () => ({ consumeRateLimit: limit, requestIp: () => "127.0.0.1" }));
vi.mock("@/src/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({ from: () => ({
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: db.answer ? { answer: db.answer } : null, error: db.fail ? { code: "offline" } : null,
    }) }) }) }),
    insert: async ({ answer }: { answer: string }) => {
      db.inserts++;
      if (db.fail) return { error: { code: "offline" } };
      if (db.answer) return { error: { code: "23505" } };
      db.answer = answer;
      return { error: null };
    },
  }) }),
}));

import { GET, POST } from "@/app/api/map-price-survey/route";
import { createSurveyIdentity, SURVEY_COOKIE, verifySurveyIdentity } from "@/src/lib/map-price-survey.server";

function request(answer?: string, token?: string, origin = "http://localhost:3101") {
  return new NextRequest("http://localhost:3101/api/map-price-survey", {
    method: answer ? "POST" : "GET", headers: {
      origin, "content-type": "application/json", ...(token ? { cookie: `${SURVEY_COOKIE}=${token}` } : {}),
    }, ...(answer ? { body: JSON.stringify({ version: "map-price-v8", answer }) } : {}),
  });
}

beforeEach(() => {
  vi.stubEnv("ABUSE_RATE_LIMIT_SECRET", "test-survey-secret");
  db.answer = null; db.fail = false; db.inserts = 0;
  limit.mockReset().mockResolvedValue(true);
});

describe("persistent survey endpoint", () => {
  it("issues a private signed HttpOnly cookie and never exposes the identity in JSON", async () => {
    const response = await GET(request());
    expect(await response.json()).toEqual({ answer: null });
    const cookie = response.cookies.get(SURVEY_COOKIE)!;
    expect(verifySurveyIdentity(cookie.value)).toMatch(/^[0-9a-f]{64}$/);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly/i);
    expect(response.headers.get("set-cookie")).toMatch(/SameSite=strict/i);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects forged and expired cookies", async () => {
    const token = createSurveyIdentity();
    expect(verifySurveyIdentity(`${token.slice(0, -1)}z`)).toBeNull();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 366 * 86400000);
    expect(verifySurveyIdentity(token)).toBeNull();
    vi.useRealTimers();
    expect((await POST(request("499", "forged"))).status).toBe(409);
    expect(db.inserts).toBe(0);
  });

  it("retains the first answer under parallel requests, retries and fresh GETs", async () => {
    const token = createSurveyIdentity();
    const responses = await Promise.all([POST(request("299", token)), POST(request("999", token))]);
    expect(await Promise.all(responses.map((response) => response.json()))).toEqual([{ answer: "299" }, { answer: "299" }]);
    expect(await (await POST(request("no", token))).json()).toEqual({ answer: "299" });
    expect(await (await GET(request(undefined, token))).json()).toEqual({ answer: "299" });
  });

  it("does not acknowledge failed writes and permits an idempotent retry", async () => {
    const token = createSurveyIdentity();
    db.fail = true;
    expect((await POST(request("499", token))).status).toBe(503);
    expect(db.answer).toBeNull();
    db.fail = false;
    expect(await (await POST(request("499", token))).json()).toEqual({ answer: "499" });
  });

  it("rejects unknown options, cookie-less writes and foreign origins before saving", async () => {
    expect((await POST(request("invalid", createSurveyIdentity()))).status).toBe(400);
    expect((await POST(request("499"))).status).toBe(409);
    expect((await POST(request("499", createSurveyIdentity(), "https://foreign.test"))).status).toBe(403);
    expect((await GET(request(undefined, undefined, "https://foreign.test"))).status).toBe(403);
    expect(db.inserts).toBe(0);
  });

  it("limits bulk submissions but still returns a receipt for an already saved response", async () => {
    const token = createSurveyIdentity();
    limit.mockResolvedValue(false);
    expect((await POST(request("499", token))).status).toBe(429);
    expect((await GET(request())).status).toBe(429);
    db.answer = "499";
    expect(await (await POST(request("999", token))).json()).toEqual({ answer: "499" });
  });
});
