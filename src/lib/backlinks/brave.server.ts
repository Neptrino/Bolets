import "server-only";

import { BRAVE_RESULTS_PER_PAGE } from "@/src/lib/backlinks/search-pagination";

type BraveSearchPayload = {
  query?: { more_results_available?: boolean };
  web?: { results?: Array<{ url?: string }> };
};

export async function searchBraveWeb(queryText: string, offset: number) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) throw new Error("BRAVE_SEARCH_API_KEY is missing");
  const query = new URLSearchParams({
    q: queryText,
    count: String(BRAVE_RESULTS_PER_PAGE),
    offset: String(offset),
    country: "es",
    search_lang: "ca",
    safesearch: "strict",
  });
  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${query}`, {
    cache: "no-store",
    headers: { Accept: "application/json", "X-Subscription-Token": key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`Brave Search returned ${response.status}: ${(await response.text()).slice(0, 240)}`);
  }
  const payload = await response.json() as BraveSearchPayload;
  return {
    results: payload.web?.results ?? [],
    moreResultsAvailable: payload.query?.more_results_available === true,
  };
}
