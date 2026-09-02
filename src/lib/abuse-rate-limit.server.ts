import "server-only";

import { createHmac } from "node:crypto";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { serviceSupabaseConfig } from "@/src/lib/supabase/config";

export function requestIp(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-real-ip")?.trim()
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
