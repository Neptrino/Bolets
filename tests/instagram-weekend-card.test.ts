import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InstagramWeekendCard, WEEKEND_MAP_SLIDE } from "@/components/instagram-weekend-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const card: DailyShareCard = {
  slug: "catalunya", title: "Catalunya", eyebrow: "Avui", available: true,
  observedAt: "2026-09-04T22:30:00Z", scope: "overview", scopeLabel: "Catalunya",
  mapPath: "/map", shareText: "",
  readings: [{ speciesId: "boletus-edulis", speciesName: "Cep", regionName: "Val d’Aran", score: 64, label: "Alta", positiveCellShare: 0.42, score20CellShare: 0.18 }],
};
const text = (slide: number, input = card) => renderToStaticMarkup(createElement(InstagramWeekendCard, { card: input, slide })).replace(/<[^>]*>/g, "");

describe("weekend editorial cards", () => {
  it("dates every frame in Catalonia and keeps the evidence limitation visible", () => {
    for (let slide = 1; slide <= 5; slide++) {
      expect(text(slide)).toMatch(/5 de set\. de(?:l)? 2026/);
      expect(text(slide)).toContain("Condicions d’avui · No confirma presència");
    }
  });

  it("keeps maxima and territorial extent together in the ranking and detail", () => {
    expect(text(2)).toContain("42% amb senyal · 18% a 20+");
    expect(text(2)).toContain("/100 · màxim");
    expect(text(3)).toContain("millor sector /100");
    expect(text(3)).toContain("sectors amb senyal positiu");
    expect(text(4)).toContain("42%");
    expect(text(4)).toContain("18% dels sectors arriben a 20/100 o més.");
  });

  it("does not promote a zero reading as a positive opportunity", () => {
    const zero = { ...card, readings: [{ ...card.readings[0], score: 0, positiveCellShare: 0, score20CellShare: 0 }] };
    expect(text(1, zero)).toContain("El senyal d’avui és a zero.");
    expect(text(3, zero)).toContain("Sense senyal positiu");
    expect(text(3, zero)).not.toContain("La lectura que destaca");
  });

  it("handles unavailable preview content without inventing readings or a map", () => {
    const empty = { ...card, available: false, readings: [], observedAt: null, isPreview: true };
    expect(text(2, empty)).toContain("Sense lectures publicables.");
    expect(text(3, empty)).toContain("Sense lectura publicable.");
    expect(text(WEEKEND_MAP_SLIDE, empty)).toContain("Mapa no disponible");
    expect(text(1, empty)).toContain("MOSTRA");
  });
});
