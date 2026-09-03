import { describe, expect, it } from "vitest";

import {
  BRAVE_MAX_OFFSET,
  BRAVE_RESULTS_PER_PAGE,
  BACKLINK_SEARCHES_PER_RUN,
  backlinkQueryForCycle,
  backlinkSearchOffsetKey,
  nextBacklinkCampaignCursor,
  nextBraveSearchOffset,
  parseBacklinkSearchOffsets,
  planBacklinkSearches,
  rotateBacklinkCampaigns,
} from "@/src/lib/backlinks/search-pagination";

describe("backlink Brave search pagination", () => {
  it("uses Brave's maximum web page size", () => {
    expect(BRAVE_RESULTS_PER_PAGE).toBe(20);
    expect(BRAVE_MAX_OFFSET).toBe(9);
    expect(BACKLINK_SEARCHES_PER_RUN).toBe(10);
  });

  it("rotates to a different campaign every cycle", () => {
    expect(nextBacklinkCampaignCursor(2, 5)).toBe(3);
    expect(nextBacklinkCampaignCursor(4, 5)).toBe(5);
    expect(nextBacklinkCampaignCursor(5, 20, 5)).toBe(10);
    expect(rotateBacklinkCampaigns(["map", "season", "guides"], 1)).toEqual(["season", "guides", "map"]);
  });

  it("advances each campaign's Brave page independently", () => {
    expect(nextBraveSearchOffset(0, true)).toBe(1);
    expect(nextBraveSearchOffset(4, true)).toBe(5);
    expect(nextBraveSearchOffset(4, false)).toBe(0);
  });

  it("rotates through genuinely different query variants between cycles", () => {
    const queries = ["mapa bolets", "zones boletaires", "condicions bolets"];
    expect(backlinkQueryForCycle(queries, 0)).toEqual({ query: "mapa bolets", queryIndex: 0 });
    expect(backlinkQueryForCycle(queries, 1)).toEqual({ query: "zones boletaires", queryIndex: 1 });
    expect(backlinkQueryForCycle(queries, 3)).toEqual({ query: "mapa bolets", queryIndex: 0 });
  });

  it("stores an independent Brave page for every query variant", () => {
    const first = backlinkSearchOffsetKey("map", "mapa bolets");
    const second = backlinkSearchOffsetKey("map", "zones boletaires");
    expect(first).toBe(backlinkSearchOffsetKey("map", "mapa bolets"));
    expect(first).not.toBe(second);
  });

  it("plans a different bounded destination batch on the next run", () => {
    const campaigns = Array.from({ length: 22 }, (_, index) => ({
      id: `page-${index}`,
      queries: [`query-${index}-a`, `query-${index}-b`],
    }));
    const first = planBacklinkSearches(campaigns, 0, {});
    const second = planBacklinkSearches(campaigns, 10, {});
    const nextRound = planBacklinkSearches(campaigns, 22, {});

    expect(first.map((plan) => plan.campaign.id)).toEqual(Array.from({ length: 10 }, (_, index) => `page-${index}`));
    expect(second.map((plan) => plan.campaign.id)).toEqual(Array.from({ length: 10 }, (_, index) => `page-${index + 10}`));
    expect(nextRound[0]?.search.query).toBe("query-0-b");
  });

  it("wraps after Brave's final supported page", () => {
    expect(nextBraveSearchOffset(9, true)).toBe(0);
  });

  it("keeps only valid persisted offsets", () => {
    expect(parseBacklinkSearchOffsets({ map: 2, season: 10, invalid: "3" })).toEqual({ map: 2 });
    expect(parseBacklinkSearchOffsets(null)).toEqual({});
  });
});
