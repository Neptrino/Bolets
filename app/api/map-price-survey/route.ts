import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, requestIp } from "@/src/lib/abuse-rate-limit.server";
import { isMapPriceSurveyAnswer, MAP_PRICE_SURVEY_VERSION } from "@/src/lib/map-price-survey-config";
import { SITE_URL } from "@/src/lib/seo";
import {
  createSurveyIdentity, readSurveyAnswer, saveSurveyAnswer, SURVEY_COOKIE,
  SURVEY_COOKIE_SECONDS, verifySurveyIdentity,
} from "@/src/lib/map-price-survey.server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers });

function crossOrigin(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  return (site !== null && site !== "same-origin" && site !== "none") ||
    (origin !== null && origin !== request.nextUrl.origin && origin !== SITE_URL);
}

export async function GET(request: NextRequest) {
  if (crossOrigin(request)) return json({ error: "Origen no permès." }, 403);
  try {
    const hash = verifySurveyIdentity(request.cookies.get(SURVEY_COOKIE)?.value);
    if (hash) return json({ answer: await readSurveyAnswer(hash) });
    if (!await consumeRateLimit(`ip:${requestIp(request)}`, "survey_identity", 600, 60)) {
      return json({ error: "Massa intents. Torna-ho a provar d’aquí a uns minuts." }, 429);
    }
    // Check storage before presenting a ready form or creating an identity.
    const token = createSurveyIdentity();
    const answer = await readSurveyAnswer(verifySurveyIdentity(token)!);
    const response = json({ answer });
    response.cookies.set(SURVEY_COOKIE, token, {
      httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
      path: "/api/map-price-survey", maxAge: SURVEY_COOKIE_SECONDS,
    });
    return response;
  } catch {
    return json({ error: "No podem carregar l’enquesta ara. Torna-ho a provar." }, 503);
  }
}

export async function POST(request: NextRequest) {
  if (crossOrigin(request) || !request.headers.get("origin")) return json({ error: "Origen no permès." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return json({ error: "Format no vàlid." }, 415);
  }
  if (Number(request.headers.get("content-length") ?? 0) > 512) return json({ error: "Petició massa gran." }, 413);
  const body = await request.text();
  if (body.length > 512) return json({ error: "Petició massa gran." }, 413);
  let value;
  try { value = JSON.parse(body); } catch { return json({ error: "Resposta no vàlida." }, 400); }
  if (value?.version !== MAP_PRICE_SURVEY_VERSION || !isMapPriceSurveyAnswer(value?.answer)) {
    return json({ error: "Resposta no vàlida. Recarrega l’enquesta." }, 400);
  }
  try {
    const hash = verifySurveyIdentity(request.cookies.get(SURVEY_COOKIE)?.value);
    if (!hash) return json({ error: "Cal permetre la galeta de l’enquesta. Recarrega la pàgina i torna-ho a provar." }, 409);
    const existing = await readSurveyAnswer(hash);
    if (existing) return json({ answer: existing });
    if (!await consumeRateLimit(`ip:${requestIp(request)}`, "survey_submit", 600, 30)) {
      return json({ error: "Massa intents. Torna-ho a provar d’aquí a uns minuts." }, 429);
    }
    return json({ answer: await saveSurveyAnswer(hash, value.answer) });
  } catch {
    return json({ error: "No hem pogut confirmar la resposta. Torna-ho a provar; no es comptarà dues vegades." }, 503);
  }
}
