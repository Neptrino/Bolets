import { describe, expect, it } from "vitest";
import { getSpecies, speciesProfiles } from "@/data/species";
import {
  altitudeCalendarSentence,
  altitudeCalendarShift,
  groupSpeciesByRainWindow,
  rainResponseState,
  rainWindowSentence,
  scoredRainWindow,
  scoredRainWindowForModel,
} from "@/src/lib/rain-response-summary";

function v2Water(speciesId: string) {
  const config = getSpecies(speciesId)?.modelConfig;
  if (!config || config.status !== "supported" || config.model !== "hydrothermal-v2") {
    throw new Error(`${speciesId} is not scored by hydrothermal-v2`);
  }
  return config;
}

describe("scored rain window", () => {
  it("reads the cep window as rain fallen 15 to 26 days ago", () => {
    const window = scoredRainWindow(v2Water("boletus-edulis").water);
    expect(window).toMatchObject({
      startDaysAgo: 15,
      endDaysAgo: 26,
      lengthDays: 12,
      excludesRecent: true,
    });
    expect(window.halfResponseNetMm).toBeCloseTo(17.5, 5);
    expect(window.nearFullNetMm).toBeCloseTo(52.5, 5);
  });

  it("reads the default ectomycorrhizal window as rain fallen 8 to 21 days ago", () => {
    const window = scoredRainWindow(v2Water("cantharellus-cibarius").water);
    expect(window).toMatchObject({ startDaysAgo: 8, endDaysAgo: 21, excludesRecent: true });
  });

  it("keeps the plain trailing window for fast saprotroph guilds", () => {
    const window = scoredRainWindow(v2Water("marasmius-oreades").water);
    expect(window).toMatchObject({ startDaysAgo: 1, endDaysAgo: 14, excludesRecent: false });
    expect(window.halfResponseNetMm).toBe(20);
  });

  it("prints gauge millimetres in 5 mm steps with the near-full figure above the half figure", () => {
    for (const species of speciesProfiles) {
      const window = scoredRainWindowForModel(species.modelConfig);
      if (!window) continue;
      expect(window.typicalHalfResponseMm % 5).toBe(0);
      expect(window.typicalNearFullMm % 5).toBe(0);
      expect(window.typicalNearFullMm).toBeGreaterThan(window.typicalHalfResponseMm);
      expect(window.typicalHalfResponseMm).toBeGreaterThan(window.halfResponseNetMm);
    }
  });

  it("phrases the cep sentence from the parameters", () => {
    const sentence = rainWindowSentence(scoredRainWindow(v2Water("boletus-edulis").water));
    expect(sentence).toMatch(/^Amb uns \d+ mm caiguts entre 15 i 26 dies abans comença a sortir; amb \d+ mm, surt amb força\.$/);
  });

  it("phrases a trailing window without a lag", () => {
    const sentence = rainWindowSentence(scoredRainWindow(v2Water("marasmius-oreades").water));
    expect(sentence).toMatch(/^Amb uns \d+ mm en els últims 14 dies comença a sortir;/);
  });

  it("returns null for species without a v2 water model", () => {
    const truffle = getSpecies("tuber-melanosporum");
    expect(truffle).toBeDefined();
    expect(scoredRainWindowForModel(truffle!.modelConfig)).toBeNull();
  });
});

describe("rain response state", () => {
  const water = { rainfallHalfSaturationMm: 20 };

  it("labels the half-saturation point as partial and three times it as full", () => {
    expect(rainResponseState(20, water)).toMatchObject({ response: 0.5, label: "parcial" });
    expect(rainResponseState(60, water).label).toBe("plena");
    expect(rainResponseState(5, water).label).toBe("escassa");
    expect(rainResponseState(40, water).label).toBe("gairebé plena");
  });

  it("never goes negative for a rainless window", () => {
    expect(rainResponseState(-3, water)).toMatchObject({ response: 0, label: "escassa" });
  });
});

describe("altitude calendar shift", () => {
  it("reports the cep calendar ahead at the top of its range and behind at the bottom", () => {
    const cep = getSpecies("boletus-edulis")!;
    const config = cep.modelConfig;
    if (config.status !== "supported" || config.model !== "hydrothermal-v2") throw new Error("cep is v2");
    const shift = altitudeCalendarShift(config.phenology.altitudeShift, cep.ecologicalConfig.habitat.altitude);
    expect(shift).not.toBeNull();
    expect(shift!.daysAheadAtTop).toBeGreaterThan(0);
    expect(shift!.daysBehindAtBottom).toBeGreaterThan(0);
    expect(shift!.daysAheadAtTop).toBeLessThanOrEqual(shift!.maxShiftDays);
    expect(altitudeCalendarSentence(shift!)).toMatch(/avançat .* endarrerit/);
  });

  it("returns null when the calendar carries no shift", () => {
    expect(altitudeCalendarShift(undefined, [100, 900])).toBeNull();
  });
});

describe("rain window groups", () => {
  it("orders groups from the fastest flush to the slowest and keeps every scored species", () => {
    const groups = groupSpeciesByRainWindow(
      speciesProfiles.map((species) => ({ commonName: species.identity.commonName, modelConfig: species.modelConfig })),
    );
    expect(groups.length).toBeGreaterThanOrEqual(3);
    for (let index = 1; index < groups.length; index += 1) {
      expect(groups[index].window.startDaysAgo).toBeGreaterThanOrEqual(groups[index - 1].window.startDaysAgo);
    }
    const scored = speciesProfiles.filter((species) => scoredRainWindowForModel(species.modelConfig)).length;
    expect(groups.reduce((total, group) => total + group.speciesNames.length, 0)).toBe(scored);
    const cepGroup = groups.find((group) => group.speciesNames.includes("Cep"));
    expect(cepGroup?.window).toMatchObject({ startDaysAgo: 15, endDaysAgo: 26 });
  });
});
