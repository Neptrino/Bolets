import "server-only";

import type {
  OperationalResyncResult,
  OperationalResyncTarget,
} from "@/src/lib/operational-resync";
import { isOperationalResyncTarget } from "@/src/lib/operational-resync";

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function numberArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
    : [];
}

export async function dispatchOperationalResync(
  target: OperationalResyncTarget,
): Promise<OperationalResyncResult> {
  const baseUrl = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseUrl || !serviceRole) {
    throw new Error("The operational resync dispatcher is not configured");
  }

  const response = await fetch(`${baseUrl}/rest/v1/rpc/dispatch_operational_resync`, {
    method: "POST",
    cache: "no-store",
    headers: {
      apikey: serviceRole,
      Authorization: `Bearer ${serviceRole}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_target: target }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`Operational resync dispatch failed (${response.status}): ${detail}`);
  }

  const payload = await response.json() as Record<string, unknown>;
  if (typeof payload.accepted !== "boolean" || !isOperationalResyncTarget(payload.target)) {
    throw new Error("Operational resync dispatch returned an invalid result");
  }
  return {
    accepted: payload.accepted,
    target: payload.target,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
    requestIds: numberArray(payload.requestIds),
    resetPipelines: stringArray(payload.resetPipelines),
  };
}
