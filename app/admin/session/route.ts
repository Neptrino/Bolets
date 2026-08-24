import { NextRequest, NextResponse } from "next/server";

import {
  createOperationalSession,
  OPERATIONAL_SESSION_COOKIE,
  OPERATIONAL_SESSION_COOKIE_OPTIONS,
  verifyOperationalCredentials,
} from "@/src/lib/operational-status-auth";

export const runtime = "nodejs";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1_000;
const MAX_ATTEMPTS = 10;

type LoginAttempt = {
  blockedUntil: number;
  failures: number;
  windowStartedAt: number;
};

const globalLoginState = globalThis as typeof globalThis & {
  boletsOperationalLoginAttempts?: Map<string, LoginAttempt>;
};
const loginAttempts = globalLoginState.boletsOperationalLoginAttempts
  ?? new Map<string, LoginAttempt>();
globalLoginState.boletsOperationalLoginAttempts = loginAttempts;

function clientKey(request: NextRequest) {
  return request.headers.get("cf-connecting-ip")
    ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? "unknown";
}

function isRateLimited(key: string, now: number) {
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (attempt.blockedUntil > now) return true;
  if (now - attempt.windowStartedAt >= ATTEMPT_WINDOW_MS) loginAttempts.delete(key);
  return false;
}

function recordFailure(key: string, now: number) {
  const existing = loginAttempts.get(key);
  const attempt = !existing || now - existing.windowStartedAt >= ATTEMPT_WINDOW_MS
    ? { blockedUntil: 0, failures: 0, windowStartedAt: now }
    : existing;
  attempt.failures += 1;
  if (attempt.failures >= MAX_ATTEMPTS) attempt.blockedUntil = now + ATTEMPT_WINDOW_MS;
  loginAttempts.set(key, attempt);
}

function loginRedirect(request: NextRequest, error: "auth" | "rate") {
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: `/admin/login?error=${error}` },
  });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function POST(request: NextRequest) {
  const now = Date.now();
  const key = clientKey(request);
  if (isRateLimited(key, now)) return loginRedirect(request, "rate");

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    recordFailure(key, now);
    return loginRedirect(request, "auth");
  }

  const username = formData.get("username");
  const password = formData.get("password");
  const validInput = typeof username === "string"
    && typeof password === "string"
    && username.length > 0
    && username.length <= 128
    && password.length > 0
    && password.length <= 256;
  const authorized = validInput
    ? await verifyOperationalCredentials(username, password)
    : false;

  if (!authorized) {
    recordFailure(key, now);
    return loginRedirect(request, "auth");
  }

  loginAttempts.delete(key);
  const session = await createOperationalSession();
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/status" },
  });
  response.cookies.set(
    OPERATIONAL_SESSION_COOKIE,
    session,
    OPERATIONAL_SESSION_COOKIE_OPTIONS,
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
