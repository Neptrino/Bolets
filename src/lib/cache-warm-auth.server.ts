import "server-only";

import { timingSafeEqual } from "node:crypto";

export function isMapWarmRequestAuthorized(headers: Pick<Headers, "get">) {
  const secret = process.env.CACHE_WARM_SECRET;
  const authorization = headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(authorization.slice(7));
  return expected.length === received.length && timingSafeEqual(expected, received);
}
