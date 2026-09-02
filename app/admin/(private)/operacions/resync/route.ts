import { NextRequest } from "next/server";

import {
  isOperationalSessionAuthorized,
} from "@/src/lib/operational-status-auth";
import { isOperationalResyncTarget } from "@/src/lib/operational-resync";
import { dispatchOperationalResync } from "@/src/lib/operational-resync-server";

export const runtime = "nodejs";

function noStoreJson(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")
    ?? request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")
    ?? new URL(request.url).protocol.slice(0, -1);
  if (!origin || !forwardedHost) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host === forwardedHost && parsed.protocol === `${forwardedProtocol}:`;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return noStoreJson({ error: "Invalid request origin" }, 403);
  const authorized = await isOperationalSessionAuthorized();
  if (!authorized) return noStoreJson({ error: "Authentication required" }, 401);

  const body = await request.json().catch(() => null) as { target?: unknown } | null;
  if (!isOperationalResyncTarget(body?.target)) {
    return noStoreJson({ error: "Invalid resync target" }, 400);
  }

  try {
    const result = await dispatchOperationalResync(body.target);
    return noStoreJson(result, result.accepted ? 202 : 409);
  } catch (error) {
    console.error("Unable to dispatch operational resync", {
      target: body.target,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return noStoreJson({ error: "The resync command could not be queued" }, 502);
  }
}
