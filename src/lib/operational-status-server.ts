import "server-only";

import { timingSafeEqual } from "node:crypto";

import type { OperationalStatus } from "@/src/lib/operational-status";

const STATUS_HEADER = "x-bolets-status-auth";

function constantTimeEqual(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length
    && timingSafeEqual(candidateBuffer, expectedBuffer);
}

export function isOperationalRequestAuthorized(requestHeaders: Headers) {
  const expected = process.env.STATUS_INTERNAL_TOKEN;
  if (!expected) return false;

  const internalHeader = requestHeaders.get(STATUS_HEADER);
  const authorization = requestHeaders.get("authorization");
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const candidate = internalHeader ?? bearer;

  return candidate ? constantTimeEqual(candidate, expected) : false;
}

export async function readOperationalStatus(): Promise<OperationalStatus> {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRole) {
    throw new Error("The operational database reader is not configured");
  }

  const response = await fetch(`${baseUrl}/rest/v1/rpc/read_operational_status`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Operational database read failed (${response.status}): ${detail}`);
  }

  return await response.json() as OperationalStatus;
}
