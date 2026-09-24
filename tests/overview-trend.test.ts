import { describe, expect, it } from "vitest";
import { compareOverviewTrend, loadOverviewTrend, overviewTrendSentence, type OverviewTrendZone } from "@/src/lib/overview-trend";
import type { WeekendOutlookHub } from "@/src/lib/weekend-outlook";
import type { GlobalPredictionMapCell } from "@/src/lib/types";

const hub = (slug: string, prepositionalName: string, west: number): WeekendOutlookHub => ({
  slug, name: slug, prepositionalName, typeLabel: "comarca", regionId: "pirineus",
  bounds: { west, east: west + 1, south: 42, north: 43 }, path: `/zones/${slug}`,
});

const hubs = [
  hub("garrotxa", "a la Garrotxa", 0), hub("guilleries", "a les Guilleries", 2), hub("ripolles", "al Ripollès", 4),
  hub("montseny", "al Montseny", 6), hub("ports", "als Ports", 8), hub("cerdanya", "a la Cerdanya", 10),
];

/** Four cells inside a hub, all with the same score. */
function cells(target: WeekendOutlookHub, score: number | null, prefix = "c"): GlobalPredictionMapCell[] {
  return [0.1, 0.3, 0.5, 0.7].map((offset, index) => ({
    cellId: `${prefix}:${target.slug}:${index}`, gridSizeM: 5000,
    cellBounds: [[target.bounds.west + offset, 42.4], [target.bounds.west + offset + 0.05, 42.45]],
    score, habitatCoverage: null, topSpeciesId: null,
  }));
}

const zones = (...changes: number[]): OverviewTrendZone[] => changes.map((change, index) => ({ hub: hubs[index]!, change }));

describe("overview trend", () => {
  it("compares each territory's equal-area mean and skips territories without enough scored cells", () => {
    const today = [...cells(hubs[0]!, 30), ...cells(hubs[1]!, 10), ...cells(hubs[2]!, null)];
    const past = [...cells(hubs[0]!, 20), ...cells(hubs[0]!, 20), ...cells(hubs[1]!, 12), ...cells(hubs[2]!, 5)];
    expect(compareOverviewTrend(today, past, hubs).map(({ hub: zone, change }) => [zone.slug, change])).toEqual([
      ["garrotxa", 10],
      ["guilleries", -2],
    ]);
  });

  it("names the shared direction and the two territories that moved most", () => {
    expect(overviewTrendSentence(zones(4.9, 4.3, 1.9, 3.5, 1.6)))
      .toBe("Respecte de fa tres dies, les condicions han millorat a totes les zones que seguim, sobretot a la Garrotxa i a les Guilleries.");
    expect(overviewTrendSentence(zones(-4, -2, -6, 0.5, -1.6, 1)))
      .toBe("Respecte de fa tres dies, les condicions han empitjorat a la majoria de zones que seguim, sobretot al Ripollès i a la Garrotxa.");
  });

  it("calls small changes steady and reports a split without a majority", () => {
    expect(overviewTrendSentence(zones(0.4, -1, 1.2, 3, -0.2)))
      .toBe("Respecte de fa tres dies, les condicions es mantenen semblants a la majoria de zones que seguim; han millorat al Montseny.");
    expect(overviewTrendSentence(zones(0.4, -1, 1.2, 0.1, -0.2)))
      .toBe("Respecte de fa tres dies, les condicions es mantenen semblants a totes les zones que seguim.");
    expect(overviewTrendSentence(zones(3, 2, -2, -4, 0, 0)))
      .toBe("Respecte de fa tres dies, les condicions han millorat a la Garrotxa i a les Guilleries, però han empitjorat al Montseny i al Ripollès.");
  });

  it("does not generalise from fewer than five territories", () => {
    expect(overviewTrendSentence(zones(5, 5, 5, 5))).toBeNull();
  });

  it("withholds the sentence when any bucket fails or is truncated", async () => {
    const all = (score: number) => hubs.flatMap((target) => cells(target, score));
    await expect(loadOverviewTrend(async () => ({ cells: all(30), truncated: false }), async () => ({ cells: all(20), truncated: false }), { hubs }))
      .resolves.toBe("Respecte de fa tres dies, les condicions han millorat a totes les zones que seguim, sobretot a la Garrotxa i a les Guilleries.");
    await expect(loadOverviewTrend(async () => ({ cells: all(30), truncated: true }), async () => ({ cells: all(20), truncated: false }), { hubs }))
      .resolves.toBeNull();
    let calls = 0;
    await expect(loadOverviewTrend(async () => {
      if (++calls === 2) throw new Error("bucket failed");
      return { cells: all(30), truncated: false };
    }, async () => ({ cells: all(20), truncated: false }), { hubs })).resolves.toBeNull();
  });
});
