import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InstagramDailyCard } from "@/components/instagram-daily-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const card: DailyShareCard = {
  slug: "catalunya", title: "Catalunya", eyebrow: "Avui", available: true,
  observedAt: "2026-09-04T22:30:00Z", scope: "overview", scopeLabel: "Catalunya",
  mapPath: "/map", shareText: "", readings: [{ speciesId: "boletus-edulis", speciesName: "Cep", regionName: "Val d’Aran", score: 64, label: "Alta", positiveCellShare: 0.42, score20CellShare: 0.18 }],
};
const text = (input = card) => renderToStaticMarkup(createElement(InstagramDailyCard, { card: input, format: "story", homeHeroUrl: "data:image/jpeg;base64,test" })).replace(/<[^>]*>/g, "");

describe("daily Instagram readings", () => {
  it("keeps the Catalonia date, maximum and territorial extent together", () => {
    expect(text()).toMatch(/5 de set\. de(?:l)? 2026/);
    expect(text()).toContain("64/100");
    expect(text()).toContain("42% positives · 18% amb 20+");
    expect(text()).toContain("No confirma presència");
  });
  it("does not turn missing data into a zero or display retained unavailable readings", () => {
    for (const unavailable of [{ ...card, available: false }, { ...card, observedAt: null }]) {
      expect(text(unavailable)).toContain("No disponible");
      expect(text(unavailable)).not.toContain("64/100");
      expect(text(unavailable)).not.toContain("sense senyal positiu");
    }
  });
  it("distinguishes a verified zero and explicitly marks simulated previews", () => {
    const zero = { ...card, isPreview: true, readings: [{ ...card.readings[0], score: 0, positiveCellShare: 0, score20CellShare: 0 }] };
    expect(text(zero)).toContain("Sense condicions favorables");
    expect(text(zero)).toContain("0/100");
    expect(text(zero)).toContain("MOSTRA");
  });
});
