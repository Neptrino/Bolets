export const BRAVE_RESULTS_PER_PAGE = 20;
export const BRAVE_MAX_OFFSET = 9;
export const BACKLINK_SEARCHES_PER_RUN = 10;
export const BACKLINK_INSPECTIONS_PER_SEARCH = 4;
export const BACKLINK_INSPECTIONS_PER_RUN = BACKLINK_SEARCHES_PER_RUN * BACKLINK_INSPECTIONS_PER_SEARCH;

export function parseBacklinkSearchOffsets(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([campaignId, offset]) => (
    Number.isInteger(offset) && Number(offset) >= 0 && Number(offset) <= BRAVE_MAX_OFFSET
      ? [[campaignId, Number(offset)]]
      : []
  )));
}

export function nextBacklinkCampaignCursor(cursor: number, campaignCount: number, step = 1) {
  if (!Number.isInteger(cursor) || cursor < 0) throw new Error("Backlink campaign cursor must be a non-negative integer");
  if (!Number.isInteger(campaignCount) || campaignCount < 1) throw new Error("At least one backlink campaign is required");
  if (!Number.isInteger(step) || step < 1 || step > campaignCount) throw new Error("Backlink campaign cursor step is invalid");
  // Keep this absolute so the completed catalogue round can select the next
  // query variant when the same destination is visited again.
  return cursor + step;
}

export function rotateBacklinkCampaigns<T>(campaigns: readonly T[], cursor: number) {
  if (!campaigns.length) throw new Error("At least one backlink campaign is required");
  if (!Number.isInteger(cursor) || cursor < 0) throw new Error("Backlink campaign cursor must be a non-negative integer");
  const start = cursor % campaigns.length;
  return campaigns.map((_, index) => campaigns[(start + index) % campaigns.length]!);
}

export function backlinkQueryForCycle(queries: readonly string[], cursor: number) {
  if (!queries.length) throw new Error("At least one backlink query is required");
  if (!Number.isInteger(cursor) || cursor < 0) throw new Error("Backlink query cursor must be a non-negative integer");
  const queryIndex = cursor % queries.length;
  return { query: queries[queryIndex]!, queryIndex };
}

export function backlinkSearchOffsetKey(campaignId: string, query: string) {
  if (!campaignId) throw new Error("Backlink campaign ID is required");
  if (!query.trim()) throw new Error("Backlink query is required");
  let hash = 2_166_136_261;
  for (const character of query.trim().toLocaleLowerCase("ca")) {
    hash ^= character.codePointAt(0)!;
    hash = Math.imul(hash, 16_777_619);
  }
  return `${campaignId}:${(hash >>> 0).toString(36)}`;
}

export function planBacklinkSearches<T extends { id: string; queries: readonly string[] }>(
  campaigns: readonly T[],
  cursor: number,
  searchOffsets: Readonly<Record<string, number>>,
  pageCount = 0,
) {
  const start = cursor % campaigns.length;
  return rotateBacklinkCampaigns(campaigns, start)
    .slice(0, BACKLINK_SEARCHES_PER_RUN)
    .map((campaign, index) => {
      const queryCycle = Math.floor((cursor + index) / campaigns.length);
      const { query } = backlinkQueryForCycle(campaign.queries, queryCycle);
      const offsetKey = backlinkSearchOffsetKey(campaign.id, query);
      return {
        campaign,
        offsetKey,
        search: {
          campaignId: campaign.id,
          query,
          offset: searchOffsets[offsetKey] ?? 0,
          pageCount,
        },
      };
    });
}

export function nextBraveSearchOffset(offset: number, moreResultsAvailable: boolean) {
  if (!Number.isInteger(offset) || offset < 0 || offset > BRAVE_MAX_OFFSET) return 0;
  return moreResultsAvailable && offset < BRAVE_MAX_OFFSET ? offset + 1 : 0;
}
