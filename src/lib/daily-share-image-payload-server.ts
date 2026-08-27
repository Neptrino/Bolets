import "server-only";

import {
  dailyShareImagePath,
  type DailyShareCard,
  type DailyShareFormat,
} from "@/src/lib/daily-share-cards";
import {
  createSignedDailyShareImagePath,
  hasSignedDailySharePayload,
  parseSignedDailyShareCard,
} from "@/src/lib/daily-share-image-payload";

export { hasSignedDailySharePayload };

function signingSecret() {
  return process.env.DAILY_SHARE_CARD_SIGNING_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

/**
 * Carries the exact public reading selected by the page into ImageResponse.
 * The signature prevents query-string edits from fabricating a branded card.
 */
export function signedDailyShareImagePath(
  card: DailyShareCard,
  format: DailyShareFormat,
) {
  const path = dailyShareImagePath(card.slug, format);
  const secret = signingSecret();
  if (!secret) return path;
  return createSignedDailyShareImagePath(card, format, secret);
}

export function readSignedDailyShareCard(
  searchParams: URLSearchParams,
  expectedSlug: string,
): DailyShareCard | null {
  const secret = signingSecret();
  return secret ? parseSignedDailyShareCard(searchParams, expectedSlug, secret) : null;
}
