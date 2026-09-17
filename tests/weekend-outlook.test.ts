import { describe, expect, it } from "vitest";
import type { GlobalPredictionMapCell, SpatialBounds } from "@/src/lib/types";
import {
  WEEKEND_OUTLOOK_MIN_CELLS,
  loadWeekendOutlook,
  summariseWeekendOutlook,
  weekendOutlookBuckets,
  weekendOutlookHubs,
  weekendOutlookIntro,
  weekendOutlookTarget,
  type WeekendOutlookHub,
} from "@/src/lib/weekend-outlook";

const at = (iso: string) => new Date(iso);

describe("weekend outlook target", () => {
  it("aims at Saturday from Monday to Friday, within the five-day forecast core", () => {
    const monday = weekendOutlookTarget(at("2026-09-14T10:00:00+02:00"));
    expect(monday.offset).toBe(5);
    expect(monday.label).toBe("dissabte 19 de setembre");
    expect(monday.horizonConfidence).toBe("limited");

    const thursday = weekendOutlookTarget(at("2026-09-17T10:00:00+02:00"));
    expect(thursday.offset).toBe(2);
    expect(thursday.horizonConfidence).toBe("moderate");

    const friday = weekendOutlookTarget(at("2026-09-18T10:00:00+02:00"));
    expect(friday.offset).toBe(1);
    expect(friday.horizonConfidence).toBe("high");
  });

  it("describes Sunday on Saturday and today's readings on Sunday", () => {
    const saturday = weekendOutlookTarget(at("2026-09-19T10:00:00+02:00"));
    expect(saturday.dayName).toBe("diumenge");
    expect(saturday.offset).toBe(1);
    expect(saturday.label).toBe("diumenge 20 de setembre");

    const sunday = weekendOutlookTarget(at("2026-09-20T10:00:00+02:00"));
    expect(sunday.offset).toBe(0);
    expect(sunday.horizonConfidence).toBeNull();
    expect(sunday.label).toBe("diumenge 20 de setembre");
  });

  it("elides the month article when the weekend falls in October", () => {
    expect(weekendOutlookTarget(at("2026-09-28T10:00:00+02:00")).label).toBe("dissabte 3 d’octubre");
  });
});

describe("weekend outlook intro", () => {
  it("names the day and scales the caveat to the distance", () => {
    expect(weekendOutlookIntro(weekendOutlookTarget(at("2026-09-17T10:00:00+02:00")))).toBe(
      "Dissabte 19 de setembre aquestes són les zones de Catalunya que arriben al cap de setmana amb les condicions més favorables, segons la pluja caiguda fins avui i el temps previst. A 2 dies vista la predicció és orientativa: torna-hi divendres per confirmar-la.",
    );
    expect(weekendOutlookIntro(weekendOutlookTarget(at("2026-09-14T10:00:00+02:00")))).toContain("A 5 dies vista la predicció encara pot canviar força");
    expect(weekendOutlookIntro(weekendOutlookTarget(at("2026-09-18T10:00:00+02:00")))).toMatch(/^Demà, dissabte 19 de setembre, aquestes són/u);
    expect(weekendOutlookIntro(weekendOutlookTarget(at("2026-09-19T10:00:00+02:00")))).toMatch(/^Demà, diumenge 20 de setembre,/u);
    expect(weekendOutlookIntro(weekendOutlookTarget(at("2026-09-20T10:00:00+02:00")))).toMatch(/^És diumenge/u);
  });
});

const hubA: WeekendOutlookHub = {
  slug: "a", name: "Alt Berguedà", prepositionalName: "a l’Alt Berguedà", typeLabel: "comarca",
  regionId: "pirineus", bounds: { west: 1, south: 42, east: 2, north: 43 }, path: "/zones/a",
};
const hubB: WeekendOutlookHub = {
  slug: "b", name: "Bages", prepositionalName: "al Bages", typeLabel: "comarca",
  regionId: "catalunya-central", bounds: { west: 1, south: 41, east: 2, north: 42 }, path: "/zones/b",
};

function cell(id: string, centre: [number, number], score: number | null, topSpeciesId: string | null = "lactarius-deliciosus"): GlobalPredictionMapCell {
  const [x, y] = centre;
  return {
    cellId: id, gridSizeM: 5000, score, topSpeciesId, habitatCoverage: 0.4,
    cellBounds: [[x - 0.02, y - 0.02], [x + 0.02, y + 0.02]],
  };
}

describe("weekend outlook summary", () => {
  it("keeps the best positive cell per territory and ranks territories by it", () => {
    const cells = [
      cell("a1", [1.2, 42.2], 35), cell("a2", [1.4, 42.4], 62, "boletus-edulis"), cell("a3", [1.6, 42.6], 10), cell("a4", [1.8, 42.8], null),
      cell("a5", [1.5, 42.5], 0),
      cell("b1", [1.2, 41.2], 70), cell("b2", [1.4, 41.4], 20), cell("b3", [1.6, 41.6], 5), cell("b4", [1.8, 41.8], 25),
    ];
    const rows = summariseWeekendOutlook(cells, [hubA, hubB]);
    expect(rows.map((row) => [row.slug, row.score, row.speciesName])).toEqual([
      ["b", 70, "Pinetell"],
      ["a", 62, "Cep"],
    ]);
    expect(rows[1]!.scoredCellCount).toBe(4);
    expect(rows[1]!.score20CellShare).toBe(0.5);
  });

  it("leaves out territories with too few scored cells or no positive cell", () => {
    const sparse = Array.from({ length: WEEKEND_OUTLOOK_MIN_CELLS - 1 }, (_, index) => cell(`a${index}`, [1.5, 42.5], 50));
    const zeros = Array.from({ length: WEEKEND_OUTLOOK_MIN_CELLS }, (_, index) => cell(`b${index}`, [1.5, 41.5], 0, null));
    expect(summariseWeekendOutlook([...sparse, ...zeros], [hubA, hubB])).toEqual([]);
  });

  it("ignores a cell delivered twice by overlapping buckets", () => {
    const cells = [cell("a1", [1.5, 42.5], 40), cell("a1", [1.5, 42.5], 40), cell("a2", [1.5, 42.5], 30), cell("a3", [1.5, 42.5], 30)];
    expect(summariseWeekendOutlook(cells, [hubA])).toEqual([]);
  });

  it("maps every published area hub with its bounds inside Catalonia", () => {
    const hubs = weekendOutlookHubs();
    expect(hubs.length).toBeGreaterThanOrEqual(10);
    for (const hub of hubs) {
      expect(hub.bounds.west).toBeLessThan(hub.bounds.east);
      expect(hub.bounds.south).toBeLessThan(hub.bounds.north);
    }
  });
});

describe("weekend outlook loading", () => {
  it("reads every bucket, tolerates a failed one and reports the result as partial", async () => {
    const buckets = weekendOutlookBuckets();
    expect(buckets.length).toBeGreaterThan(4);
    const requested: Array<[SpatialBounds, number]> = [];
    const outlook = await loadWeekendOutlook(
      weekendOutlookTarget(at("2026-09-17T10:00:00+02:00")),
      async (bounds, offset) => {
        requested.push([bounds, offset]);
        if (requested.length === 2) throw new Error("edge outage");
        return {
          truncated: false,
          cells: Array.from({ length: 5 }, (_, index) => cell(`${bounds.west}:${bounds.south}:${index}`, [1.5, 42.5], 40 + index)),
        };
      },
      { hubs: [hubA, hubB] },
    );
    expect(requested).toHaveLength(buckets.length);
    expect(requested.every(([, offset]) => offset === 2)).toBe(true);
    expect(outlook.partial).toBe(true);
    expect(outlook.rows).toHaveLength(1);
    expect(outlook.rows[0]!.slug).toBe("a");
  });

  it("does not read frames when the weekend is already today", async () => {
    const outlook = await loadWeekendOutlook(
      weekendOutlookTarget(at("2026-09-20T10:00:00+02:00")),
      async () => { throw new Error("must not be called"); },
    );
    expect(outlook.rows).toEqual([]);
    expect(outlook.partial).toBe(false);
  });
});
