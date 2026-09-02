import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serviceSupabaseConfig } from "@/src/lib/supabase/config";

export const CONTRIBUTOR_DETAIL_COOKIE = "bolets_contributor_detail";
const CAPABILITY_SECONDS = 5 * 60;

type CapabilityPayload = {
  version: 1;
  expiresAt: number;
};

function capabilitySecret() {
  const configured = process.env.CONTRIBUTOR_ACCESS_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CONTRIBUTOR_ACCESS_SECRET is required in production");
  }
  return serviceSupabaseConfig().key;
}

function signature(payload: string) {
  return createHmac("sha256", capabilitySecret()).update(payload).digest("base64url");
}

function encodeCapability(activeUntil: string) {
  const accessExpiry = Math.floor(new Date(activeUntil).getTime() / 1000);
  const expiresAt = Math.min(
    accessExpiry,
    Math.floor(Date.now() / 1000) + CAPABILITY_SECONDS,
  );
  const payload = Buffer.from(JSON.stringify({ version: 1, expiresAt } satisfies CapabilityPayload))
    .toString("base64url");
  return { token: `${payload}.${signature(payload)}`, expiresAt };
}

function verifyCapability(token: string | undefined) {
  if (!token) return false;
  const [payload, candidateSignature, extra] = token.split(".");
  if (!payload || !candidateSignature || extra) return false;
  const expectedSignature = signature(payload);
  const candidate = Buffer.from(candidateSignature);
  const expected = Buffer.from(expectedSignature);
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CapabilityPayload;
    return decoded.version === 1
      && Number.isInteger(decoded.expiresAt)
      && decoded.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function setContributorDetailCapability(activeUntil: string) {
  const cookieStore = await cookies();
  const { token, expiresAt } = encodeCapability(activeUntil);
  cookieStore.set(CONTRIBUTOR_DETAIL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    expires: new Date(expiresAt * 1000),
  });
}

export async function clearContributorDetailCapability() {
  const cookieStore = await cookies();
  cookieStore.set(CONTRIBUTOR_DETAIL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api",
    maxAge: 0,
  });
}

export async function hasContributorDetailCapability() {
  const token = (await cookies()).get(CONTRIBUTOR_DETAIL_COOKIE)?.value;
  return verifyCapability(token);
}

export function isDetailedMapResolution(resolution: number) {
  return resolution < 2500;
}

export const PRIVATE_MAP_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Accept-Encoding",
};

export function detailedMapAccessDenied() {
  return Response.json(
    { error: "detailed_map_requires_contributor" },
    { status: 403, headers: PRIVATE_MAP_HEADERS },
  );
}
