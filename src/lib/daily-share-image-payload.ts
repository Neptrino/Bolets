import { createHmac, timingSafeEqual } from "node:crypto";
import {
  dailyShareImagePath,
  type DailyShareCard,
  type DailyShareFormat,
} from "@/src/lib/daily-share-cards";

const PAYLOAD_PARAMETER = "card";
const SIGNATURE_PARAMETER = "signature";
const SIGNATURE_CONTEXT = "daily-share-image-v1:";
const MAX_PAYLOAD_LENGTH = 12_000;

function signatureFor(payload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(`${SIGNATURE_CONTEXT}${payload}`)
    .digest();
}

function imageCard(card: DailyShareCard): DailyShareCard {
  return {
    ...card,
    // These fields drive page actions but are not used by ImageResponse.
    mapPath: "",
    shareText: "",
  };
}

export function createSignedDailyShareImagePath(
  card: DailyShareCard,
  format: DailyShareFormat,
  secret: string,
) {
  const path = dailyShareImagePath(card.slug, format);
  const payload = Buffer.from(JSON.stringify(imageCard(card))).toString("base64url");
  const signature = signatureFor(payload, secret).toString("base64url");
  return `${path}&${PAYLOAD_PARAMETER}=${payload}&${SIGNATURE_PARAMETER}=${signature}`;
}

export function hasSignedDailySharePayload(searchParams: URLSearchParams) {
  return searchParams.has(PAYLOAD_PARAMETER) || searchParams.has(SIGNATURE_PARAMETER);
}

export function parseSignedDailyShareCard(
  searchParams: URLSearchParams,
  expectedSlug: string,
  secret: string,
): DailyShareCard | null {
  const payload = searchParams.get(PAYLOAD_PARAMETER);
  const suppliedSignature = searchParams.get(SIGNATURE_PARAMETER);
  if (!payload || !suppliedSignature || payload.length > MAX_PAYLOAD_LENGTH) return null;

  try {
    const expectedSignature = signatureFor(payload, secret);
    const actualSignature = Buffer.from(suppliedSignature, "base64url");
    if (
      actualSignature.length !== expectedSignature.length ||
      !timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }
    const card = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as DailyShareCard;
    return card?.slug === expectedSlug && Array.isArray(card.readings) ? card : null;
  } catch {
    return null;
  }
}
