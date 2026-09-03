import { describe, expect, it } from "vitest";

import { buildSitemap } from "@/app/sitemap";
import {
  BACKLINK_CAMPAIGNS,
  BACKLINK_EXCLUDED_PUBLIC_PATHS,
  BACKLINK_QUERY_VARIANTS_PER_CAMPAIGN,
} from "@/data/backlink-campaigns";

describe("backlink campaign catalogue", () => {
  it("covers every useful public sitemap page exactly once", () => {
    const campaignIds = BACKLINK_CAMPAIGNS.map((campaign) => campaign.id);
    const campaignPaths = BACKLINK_CAMPAIGNS.map((campaign) => campaign.targetPath);
    const excluded = new Set<string>(BACKLINK_EXCLUDED_PUBLIC_PATHS);
    const sitemapPaths = buildSitemap().map((entry) => new URL(entry.url).pathname);

    expect(new Set(campaignIds).size).toBe(campaignIds.length);
    expect(new Set(campaignPaths).size).toBe(campaignPaths.length);
    expect(sitemapPaths.filter((path) => !excluded.has(path)).sort()).toEqual([...campaignPaths].sort());
    expect(campaignPaths.some((path) => excluded.has(path))).toBe(false);
  });

  it("uses observed search demand before curated variants and keeps both", () => {
    const current = BACKLINK_CAMPAIGNS.find((campaign) => campaign.targetPath === "/bolets-avui");
    const cep = BACKLINK_CAMPAIGNS.find((campaign) => campaign.targetPath === "/bolets/cep");

    expect(current?.queries[0]).toBe("on trobar bolets avui");
    expect(current?.queries).toContain("bolets avui Catalunya condicions temporada");
    expect(cep?.queries).toContain("cep bolet");
    expect(cep?.queries).toContain("Cep bolet identificació hàbitat");
  });

  it("keeps every campaign complete and bounded", () => {
    for (const campaign of BACKLINK_CAMPAIGNS) {
      expect(campaign.queries.length).toBeGreaterThan(0);
      expect(campaign.queries.length).toBeLessThanOrEqual(BACKLINK_QUERY_VARIANTS_PER_CAMPAIGN);
      expect(campaign.topicTerms.length).toBeGreaterThan(0);
      expect(campaign.targetPath.startsWith("/")).toBe(true);
    }
  });
});
