import "server-only";

import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { MAP_PRICE_SURVEY_ANSWERS, MAP_PRICE_SURVEY_VERSION, type MapPriceSurveyAnswer } from "./map-price-survey-config";

export const SURVEY_PAGE_SIZE = 50;

export async function readAdminSurvey(page: number) {
  await requireOperationalSession();
  const admin = createSupabaseAdminClient();
  const [receipts, ...totals] = await Promise.all([
    admin.from("map_price_survey_responses").select("id, answer, created_at", { count: "exact" })
      .eq("survey_version", MAP_PRICE_SURVEY_VERSION)
      .order("created_at", { ascending: false }).order("id", { ascending: false })
      .range((page - 1) * SURVEY_PAGE_SIZE, page * SURVEY_PAGE_SIZE - 1),
    ...MAP_PRICE_SURVEY_ANSWERS.map((option) => admin.from("map_price_survey_responses")
      .select("id", { count: "exact", head: true }).eq("survey_version", MAP_PRICE_SURVEY_VERSION).eq("answer", option.value)),
  ]);
  if (receipts.error || totals.some((result) => result.error)) throw new Error("Survey results unavailable");
  return {
    total: receipts.count ?? 0,
    options: MAP_PRICE_SURVEY_ANSWERS.map((option, index) => ({ ...option, count: totals[index].count ?? 0 })),
    receipts: (receipts.data ?? []) as { id: string; answer: MapPriceSurveyAnswer; created_at: string }[],
  };
}
