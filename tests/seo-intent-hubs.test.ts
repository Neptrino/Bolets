import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import EdibleMushroomsPage, { metadata as edibleMetadata } from "@/app/bolets-comestibles/page";
import PoisonousMushroomsPage, { metadata as poisonousMetadata } from "@/app/bolets-verinosos/page";
import { buildSitemap as sitemap } from "@/app/sitemap";
import { getEditorialMetadata } from "@/data/editorial";

describe("edible and poisonous search-intent hubs", () => {
  it("answers the main edible-mushroom intent and links to supporting guides", () => {
    const html = renderToStaticMarkup(createElement(EdibleMushroomsPage));

    expect(html).toContain("Com triar entre els tipus de bolets comestibles");
    expect(html).toContain("comestibles amb condicions concretes");
    for (const href of ["/zones/ceps", "/zones/rovellons", "/temporada", "/bolets-avui", "/map", "/conservar-bolets"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(edibleMetadata.alternates?.canonical).toBe("/bolets-comestibles");
    expect(getEditorialMetadata("bolets-comestibles").updatedAt).toBe("2026-08-31");
    expect(sitemap().find((entry) => entry.url.endsWith("/bolets-comestibles"))?.lastModified)
      .toEqual(new Date("2026-08-31T00:00:00+02:00"));
  });

  it("distinguishes toxic mushrooms from the wider non-edible category", () => {
    const html = renderToStaticMarkup(createElement(PoisonousMushroomsPage));

    expect(html).toContain("Bolets tòxics, verinosos i no comestibles");
    expect(html).toContain("“No comestible” és més ampli");
    expect(html).toContain('href="/bolets"');
    for (const href of [
      "/compare/ou-de-reig-vs-reig-bord",
      "/compare/rossinyol-vs-bolet-olivera",
      "/compare/cep-vs-matagent",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(poisonousMetadata.alternates?.canonical).toBe("/bolets-verinosos");
    expect(poisonousMetadata.description?.length).toBeLessThanOrEqual(155);
    expect(getEditorialMetadata("bolets-verinosos").updatedAt).toBe("2026-08-26");
    expect(sitemap().find((entry) => entry.url.endsWith("/bolets-verinosos"))?.lastModified)
      .toEqual(new Date("2026-08-26T00:00:00+02:00"));
  });
});
