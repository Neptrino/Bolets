import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JournalSummary, TodayForYou } from "@/components/my-forest/dashboard";
import { simulateSavedForestReadings } from "@/src/lib/my-forest/dashboard";

describe("El meu bosc dashboard states", () => {
  it("renders a clear first-use state and truthful trend boundary", () => {
    const html = renderToStaticMarkup(createElement(TodayForYou, {
      preferences: { speciesIds: [], territorySlugs: [] },
      readings: [],
    }));
    expect(html).toContain("El teu bosc avui");
    expect(html).toContain("Tria espècies i territoris per començar");
    expect(html).toContain("No etiquetem cap tendència");
  });

  it("labels the development simulation so it cannot be mistaken for a prediction", () => {
    const html = renderToStaticMarkup(createElement(TodayForYou, {
      preferences: { speciesIds: [], territorySlugs: [] },
      readings: [],
      simulation: true,
    }));
    expect(html).toContain("Previsualització local");
    expect(html).toContain("no descriuen condicions reals i no es desen");
    expect(html).toContain('href="/compte/bosc"');
  });

  it("keeps model-window metadata out of available reading cards", () => {
    const preferences = {
      speciesIds: ["boletus-edulis"],
      territorySlugs: ["ripolles"],
    };
    const readings = simulateSavedForestReadings([{
      speciesId: "boletus-edulis",
      speciesName: "Cep",
      territorySlug: "ripolles",
      territoryName: "Ripollès",
      territoryType: "comarca",
      territoryPath: "/zones/ripolles",
      mapPath: "/map?species=boletus-edulis",
      status: "withheld",
      seasonalActivity: "good",
      rainfallWindowDays: 26,
      recentRainWindowDays: 14,
      temperatureWindowDays: 20,
      summary: null,
    }], new Date("2026-08-29T12:00:00Z"));
    const html = renderToStaticMarkup(createElement(TodayForYou, {
      preferences,
      readings,
      simulation: true,
    }));
    expect(html).toContain("Veure el mapa");
    expect(html).toContain("Positius");
    expect(html).toContain("Amb 20 o més");
    expect(html).toContain("forest-reading-group");
    expect(html).not.toContain("forest-reading is-");
    expect(html).not.toContain("Factor més limitant");
    expect(html).not.toContain("Pluja de 26 dies");
    expect(html).not.toContain("temperatura de 20 dies");
  });

  it("lists unsupported saved combinations compactly instead of rendering empty cards", () => {
    const html = renderToStaticMarkup(createElement(TodayForYou, {
      preferences: {
        speciesIds: ["boletus-edulis", "cantharellus-cibarius"],
        territorySlugs: ["ripolles", "cerdanya"],
      },
      readings: [],
      unavailableCombinations: [{
        speciesId: "cantharellus-cibarius",
        speciesName: "Rossinyol",
        territorySlug: "cerdanya",
        territoryName: "Cerdanya",
      }],
    }));
    expect(html).toContain("1 combinació sense lectura territorial");
    expect(html).toContain("Rossinyol");
    expect(html).toContain("Cerdanya");
    expect(html).not.toContain("forest-reading is-");
  });

  it("groups non-scored readings by territory without model-window details", () => {
    const baseReading = {
      territorySlug: "ripolles",
      territoryName: "Ripollès",
      territoryType: "comarca",
      territoryPath: "/zones/ripolles",
      seasonalActivity: "good" as const,
      rainfallWindowDays: 21 as const,
      recentRainWindowDays: 7,
      temperatureWindowDays: 20 as const,
      summary: null,
    };
    const html = renderToStaticMarkup(createElement(TodayForYou, {
      preferences: {
        speciesIds: ["boletus-edulis", "cantharellus-cibarius"],
        territorySlugs: ["ripolles"],
      },
      readings: [
        {
          ...baseReading,
          speciesId: "boletus-edulis",
          speciesName: "Cep",
          mapPath: "/map?species=boletus-edulis",
          status: "unavailable" as const,
        },
        {
          ...baseReading,
          speciesId: "cantharellus-cibarius",
          speciesName: "Rossinyol",
          mapPath: "/map?species=cantharellus-cibarius",
          status: "outside-season" as const,
        },
      ],
    }));
    expect(html).toContain("forest-compact-group");
    expect(html).toContain("Temporalment no disponible");
    expect(html).toContain("Fora de la temporada general");
    expect(html.match(/<h3/g)).toHaveLength(1);
    expect(html).not.toContain("Pluja de 21 dies");
    expect(html).not.toContain("forest-reading is-");
  });

  it("renders the private journal empty state with an offline-capable next step", () => {
    const html = renderToStaticMarkup(createElement(JournalSummary, {
      summary: {
        seasonLabel: "2026–27",
        startDate: "2026-07-01",
        endDate: "2027-07-01",
        total: 0,
        speciesCount: 0,
        publicCount: 0,
        privateCount: 0,
        topSpecies: null,
        firstObservedOn: null,
        latestObservedOn: null,
      },
    }));
    expect(html).toContain("La teva temporada");
    expect(html).toContain("La temporada encara és en blanc");
    expect(html).toContain("encara que no tinguis connexió");
    expect(html).toContain('href="/troballes/nova"');
  });
});
