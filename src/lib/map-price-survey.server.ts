import "server-only";

import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { serviceSupabaseConfig } from "@/src/lib/supabase/config";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { MAP_PRICE_SURVEY_VERSION, type MapPriceSurveyAnswer } from "./map-price-survey-config";

export const SURVEY_COOKIE = "bolets_survey";
export const SURVEY_COOKIE_SECONDS = 365 * 24 * 60 * 60;
const table = "map_price_survey_responses";

function sign(payload: string) {
  return createHmac("sha256", process.env.ABUSE_RATE_LIMIT_SECRET || serviceSupabaseConfig().key)
    .update(`map-price-survey:${payload}`).digest("hex");
}

export function createSurveyIdentity() {
  const expires = Math.floor(Date.now() / 1000) + SURVEY_COOKIE_SECONDS;
  const payload = `${randomUUID()}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySurveyIdentity(token: string | undefined) {
  if (!token || token.length > 160) return null;
  const [id, expires, signature, extra] = token.split(".");
  if (extra || !/^[0-9a-f-]{36}$/.test(id) || !/^\d{10}$/.test(expires ?? "") ||
      !/^[0-9a-f]{64}$/.test(signature ?? "")) return null;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(sign(`${id}.${expires}`)))) return null;
  return createHash("sha256").update(`${MAP_PRICE_SURVEY_VERSION}:${id}`).digest("hex");
}

export async function readSurveyAnswer(respondentHash: string): Promise<MapPriceSurveyAnswer | null> {
  const { data, error } = await createSupabaseAdminClient().from(table).select("answer")
    .eq("survey_version", MAP_PRICE_SURVEY_VERSION).eq("respondent_hash", respondentHash).maybeSingle();
  if (error) throw new Error("Survey receipt unavailable");
  return data?.answer ?? null;
}

export async function saveSurveyAnswer(respondentHash: string, answer: MapPriceSurveyAnswer) {
  const { error } = await createSupabaseAdminClient().from(table).insert({
    survey_version: MAP_PRICE_SURVEY_VERSION, respondent_hash: respondentHash, answer,
  });
  // The unique constraint arbitrates concurrent requests; the first answer wins.
  if (error && error.code !== "23505") throw new Error("Survey response could not be saved");
  const saved = await readSurveyAnswer(respondentHash);
  if (!saved) throw new Error("Survey receipt missing");
  return saved;
}
