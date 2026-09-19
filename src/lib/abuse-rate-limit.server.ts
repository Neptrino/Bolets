import "server-only";

import { createHmac } from "node:crypto";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { serviceSupabaseConfig } from "@/src/lib/supabase/config";

// Caddy always sets X-Real-IP from its own verdict (the TCP peer, or
// CF-Connecting-IP when the peer is a trusted Cloudflare edge) and strips any
// client copy, so it is the only header worth reading in production; the
// X-Forwarded-For fallback serves local development without the proxy.
export function requestIp(request: Request) {
  return request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}
function subjectHash(subject: string) {
  const secret = process.env.ABUSE_RATE_LIMIT_SECRET ?? serviceSupabaseConfig().key;
  return createHmac("sha256", secret).update(subject).digest("hex");
}

export async function consumeRateLimit(
  subject: string,
  scope: string,
  windowSeconds: number,
  limit: number,
) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("consume_abuse_rate_limit", {
    p_subject_hash: subjectHash(subject),
    p_scope: scope,
    p_window_seconds: windowSeconds,
    p_limit: limit,
  });
  if (error) throw new Error("Could not evaluate request rate");
  return data === true;
}
