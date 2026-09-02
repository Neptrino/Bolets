import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { serviceSupabaseConfig } from "@/src/lib/supabase/config";

export const CONTRIBUTOR_DETAIL_COOKIE = "bolets_contributor_detail";
const CAPABILITY_SECONDS = 5 * 60;

type CapabilityPayload = {
  version: 2;
  expiresAt: number;
  minimumResolutionM: 250 | 1000;
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

function encodeCapability(activeUntil: string, minimumResolutionM: 250 | 1000) {
  const accessExpiry = Math.floor(new Date(activeUntil).getTime() / 1000);
  const expiresAt = Math.min(
    accessExpiry,
    Math.floor(Date.now() / 1000) + CAPABILITY_SECONDS,
  );
  const payload = Buffer.from(JSON.stringify({
    version: 2,
    expiresAt,
    minimumResolutionM,
  } satisfies CapabilityPayload))
    .toString("base64url");
  return { token: `${payload}.${signature(payload)}`, expiresAt };
}

function verifyCapability(token: string | undefined) {
  if (!token) return null;
  const [payload, candidateSignature, extra] = token.split(".");
  if (!payload || !candidateSignature || extra) return null;
  const expectedSignature = signature(payload);
  const candidate = Buffer.from(candidateSignature);
  const expected = Buffer.from(expectedSignature);
  if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CapabilityPayload;
    return decoded.version === 2
      && Number.isInteger(decoded.expiresAt)
      && decoded.expiresAt > Math.floor(Date.now() / 1000)
      && (decoded.minimumResolutionM === 250 || decoded.minimumResolutionM === 1000)
      ? decoded.minimumResolutionM
      : null;
  } catch {
    return null;
  }
}

export async function setContributorDetailCapability(
  activeUntil: string,
  minimumResolutionM: 250 | 1000,
) {
  const cookieStore = await cookies();
  const { token, expiresAt } = encodeCapability(activeUntil, minimumResolutionM);
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

export async function hasMapResolutionCapability(resolution: number) {
  const token = (await cookies()).get(CONTRIBUTOR_DETAIL_COOKIE)?.value;
  const minimumResolutionM = verifyCapability(token);
  return minimumResolutionM !== null && resolution >= minimumResolutionM;
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
