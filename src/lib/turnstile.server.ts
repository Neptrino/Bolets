import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const FINDING_TURNSTILE_ACTION = "finding_publish";

type TurnstileResponse = {
  success?: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
};

function allowedHostnames() {
  return new Set(
    (process.env.TURNSTILE_HOSTNAMES ?? "bolets.app,www.bolets.app,localhost,127.0.0.1")
      .split(",")
      .map((hostname) => hostname.trim().toLowerCase())
      .filter(Boolean),
  );
}
function idempotencyKey(token: string) {
  const hash = createHash("sha256").update(token).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20)}`;
}

export async function findingTurnstileRequired(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.rpc("requires_finding_turnstile", { p_user_id: userId });
  if (error) throw new Error("Could not evaluate publication verification");
  return data === true;
}

export async function verifyFindingTurnstile(token: string | null | undefined, remoteIp?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("La verificació anti-brossa no està configurada.");
  if (!token || token.length > 2048) throw new Error("Completa la verificació abans de publicar.");

  const body = new URLSearchParams({
    secret,
    response: token,
    idempotency_key: idempotencyKey(token),
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let result: TurnstileResponse;
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Turnstile verification unavailable");
    result = await response.json() as TurnstileResponse;
  } catch {
    throw new Error("No hem pogut verificar la publicació. Torna-ho a provar.");
  } finally {
    clearTimeout(timeout);
  }

  const hostname = result.hostname?.toLowerCase();
  if (!result.success || result.action !== FINDING_TURNSTILE_ACTION || !hostname || !allowedHostnames().has(hostname)) {
    throw new Error("La verificació ha caducat o no és vàlida. Torna-la a completar.");
  }
}
