import { queueUmamiEvent, UMAMI_EVENTS, type UmamiEventName } from "@/src/lib/umami-goals";
import {
  isMapPriceSurveyAnswer, MAP_PRICE_SURVEY_API, MAP_PRICE_SURVEY_VERSION,
  type MapPriceSurveyAnswer,
} from "./map-price-survey-config";
export { MAP_PRICE_SURVEY_PATH, MAP_PRICE_SURVEY_ANSWERS } from "./map-price-survey-config";

export const MAP_PRICE_SURVEY_KEY = `bolets:${MAP_PRICE_SURVEY_VERSION}`;
type SurveyState = "" | "opened" | MapPriceSurveyAnswer;
const changeEvent = "bolets:map-price-survey";
const memory = new Map<string, string>();
let pending: Promise<void> | undefined;

function read(key: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(key) ?? memory.get(key) ?? "";
  } catch {
    return memory.get(key) ?? "";
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // In-memory deduplication still works when storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function getMapPriceSurveyState(): SurveyState {
  const value = read(MAP_PRICE_SURVEY_KEY);
  return value === "opened" || isMapPriceSurveyAnswer(value)
    ? value as SurveyState : "";
}

export function isMapPriceSurveyBannerHidden() {
  const state = getMapPriceSurveyState();
  let answered = false;
  try { answered = isMapPriceSurveyAnswer(localStorage.getItem(`${MAP_PRICE_SURVEY_KEY}:receipt`)); } catch { /* Optional UI hint only. */ }
  return answered || Boolean(read(`${MAP_PRICE_SURVEY_KEY}:dismissed`)) || (state !== "" && state !== "opened");
}

export function dismissMapPriceSurveyBanner() {
  write(`${MAP_PRICE_SURVEY_KEY}:dismissed`, "1");
}

export function subscribeMapPriceSurvey(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function analyticsEnabled() {
  if (!process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID ||
    navigator.doNotTrack === "1" || navigator.doNotTrack === "yes") return false;
  try {
    return !window.localStorage.getItem("umami.disabled");
  } catch {
    return false;
  }
}

function recordOnce(key: string, event: UmamiEventName) {
  if (read(key)) return;
  write(key, "1");
  if (analyticsEnabled()) queueUmamiEvent(event);
}

export function showMapPriceSurvey() {
  recordOnce(`${MAP_PRICE_SURVEY_KEY}:shown`, UMAMI_EVENTS.mapPriceSurveyShown);
}

export function clickMapPriceSurveyBanner() {
  showMapPriceSurvey();
  recordOnce(`${MAP_PRICE_SURVEY_KEY}:clicked`, UMAMI_EVENTS.mapPriceSurveyClicked);
}

export function openMapPriceSurvey() {
  if (getMapPriceSurveyState()) return;
  write(MAP_PRICE_SURVEY_KEY, "opened");
  if (analyticsEnabled()) queueUmamiEvent(UMAMI_EVENTS.mapPriceSurveyOpened);
}

function rememberReceipt(answer: MapPriceSurveyAnswer | null) {
  try {
    if (answer) localStorage.setItem(`${MAP_PRICE_SURVEY_KEY}:receipt`, answer);
    else localStorage.removeItem(`${MAP_PRICE_SURVEY_KEY}:receipt`);
  } catch { /* The server cookie and database remain authoritative. */ }
  write(MAP_PRICE_SURVEY_KEY, answer ?? (getMapPriceSurveyState() === "opened" ? "opened" : ""));
}

async function requestReceipt(answer?: MapPriceSurveyAnswer) {
  const response = await fetch(MAP_PRICE_SURVEY_API, {
    method: answer ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    ...(answer ? {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: MAP_PRICE_SURVEY_VERSION, answer }),
    } : {}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No hem pogut confirmar la resposta. Torna-ho a provar.");
  if (result.answer !== null && !isMapPriceSurveyAnswer(result.answer)) throw new Error("Resposta del servidor no vàlida.");
  if (answer && !result.answer) throw new Error("No hem pogut confirmar la resposta. Torna-ho a provar.");
  rememberReceipt(result.answer);
}

// Serialize identity setup across tabs before the first cookie exists. The DB
// unique constraint also protects browsers without Web Locks and concurrent POSTs.
async function withSurveyLock(action: () => Promise<void>): Promise<void> {
  await (navigator.locks ? navigator.locks.request(MAP_PRICE_SURVEY_KEY, action) : action());
}

export function loadMapPriceSurvey() {
  return withSurveyLock(() => requestReceipt());
}

export function answerMapPriceSurvey(answer: MapPriceSurveyAnswer) {
  if (pending) return pending;
  pending = withSurveyLock(async () => {
    openMapPriceSurvey();
    // Refresh the authoritative receipt, also recovering a lost POST response.
    await requestReceipt();
    if (isMapPriceSurveyAnswer(getMapPriceSurveyState())) return;
    await requestReceipt(answer);
  }).finally(() => { pending = undefined; });
  return pending;
}
