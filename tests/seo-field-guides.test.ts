import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import WoodFungiPage, { metadata as woodMetadata } from "@/app/bolets-de-soca/page";
import FalseChanterellePage, { metadata as falseMetadata } from "@/app/fals-rossinyol/page";
import CollectingPage, { metadata as collectingMetadata } from "@/app/normativa-bolets/page";
import EditorialTeamPage from "@/app/equip-editorial/page";
import { buildSitemap as sitemap } from "@/app/sitemap";
import { editorialArticleFields, getEditorialMetadata, publicEditorialItems } from "@/data/editorial";
import { speciesGalleryMedia } from "@/data/species-gallery-media";
import { getSpecies, speciesProfiles } from "@/data/species";
import { getReferenceSpecies } from "@/data/reference-species";
import { woodFungiSpeciesIds } from "@/data/wood-fungi";
import { collectingSources, falseChanterelleSources } from "@/data/field-guide-sources";
import { speciesPath } from "@/src/lib/seo";

describe("source-linked field guides", () => {
  const guides = [
    { id: "bolets-de-soca", page: WoodFungiPage, metadata: woodMetadata },
    { id: "fals-rossinyol", page: FalseChanterellePage, metadata: falseMetadata },
  ];

  it.each(guides)("publishes $id without implying independent review", ({ id, page, metadata }) => {
    const html = renderToStaticMarkup(createElement(page));
    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(`/${id}`);
    expect(metadata.description?.length).toBeLessThanOrEqual(155);
    expect(html).toContain("Editorial, no micològica");
    expect(html).not.toMatch(/Esborrany|independent pendent|revisió experta pendent/);
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).not.toContain('"reviewedBy"');
    expect(sitemap().find(entry => entry.url.endsWith(`/${id}`))?.lastModified).toEqual(new Date("2026-08-27T00:00:00+02:00"));
    expect(publicEditorialItems).toContain(id);
    expect(getEditorialMetadata(id).reviewStatus).toBe("editorial-only");
    expect(editorialArticleFields(id)).not.toHaveProperty("reviewedBy");
  });

  it("does not promise an upcoming expert review on the editorial policy page", () => {
    const html = renderToStaticMarkup(createElement(EditorialTeamPage));
    expect(html).toContain("ara mateix no n’hi ha cap de prevista");
    expect(html).not.toContain("independent pendent");
    expect(html).not.toContain('"reviewedBy"');
  });

  it("lists existing wood-growing catalogue species with their original safety labels", () => {
    const html = renderToStaticMarkup(createElement(WoodFungiPage));
    expect(woodFungiSpeciesIds).toHaveLength(4);
    expect(new Set(woodFungiSpeciesIds).size).toBe(4);
    expect(html.match(/class="species-card"/g)).toHaveLength(4);
    for (const id of woodFungiSpeciesIds) {
      const species = getSpecies(id)!;
      expect(species, id).toBeDefined();
      expect(html).toContain(`href="${speciesPath(species)}"`);
      expect(html).toContain(species.identity.commonName);
      expect(html).toContain(species.identity.scientificName);
      expect(species.ecologicalConfig.soil.substrate, id).toMatch(/lignícola|fusta/i);
    }
    expect(getSpecies("omphalotus-olearius")?.identity.edibility).toBe("toxic");
    expect(getSpecies("galerina-marginata")?.identity.edibility).toBe("dangerously_toxic");
    expect(html).toContain('aria-label="Advertiment de consum: Tòxic"');
    expect(html).toContain('aria-label="Advertiment de consum: Molt tòxic"');
    expect(html).toContain("no és una llista completa");
  });

  it("keeps the broad wood-fungi name distinct from a single species", () => {
    const html = renderToStaticMarkup(createElement(WoodFungiPage));
    for (const name of ["Fomes fomentarius", "Phellinus torulosus", "Ganoderma lucidum"]) expect(html).toContain(name);
    expect(html).toContain("no equival a buscar una sola fitxa científica");
  });

  it("separates false chanterelle from olive mushroom without adding model ecology", () => {
    const html = renderToStaticMarkup(createElement(FalseChanterellePage));
    for (const name of ["Hygrophoropsis aurantiaca", "Cantharellus cibarius", "Omphalotus olearius"]) expect(html).toContain(name);
    expect(html).toContain("No el consideris un bolet per al consum");
    expect(html).toContain("no comestible");
    expect(html).toContain("sospitós i sense valor culinari");
    expect(speciesProfiles.some(species => species.speciesId === "hygrophoropsis-aurantiaca")).toBe(false);
  });

  it("answers reader questions about false chanterelle instead of describing editorial work", () => {
    const html = renderToStaticMarkup(createElement(FalseChanterellePage));
    for (const heading of ["El fals rossinyol és comestible?", "On i quan apareix?", "Què fer si tens dubtes?"]) expect(html).toContain(heading);
    expect(html).not.toMatch(/Què aporta la segona font|Contrast documental|no incorpora una nova espècie al mapa/);
    for (const source of falseChanterelleSources) expect(html).toContain(`href="${source.url}"`);
  });

  it("shows the descriptive false-chanterelle profile alongside its lookalikes", () => {
    const html = renderToStaticMarkup(createElement(FalseChanterellePage));
    expect(html.match(/class="species-card"/g)).toHaveLength(3);
    for (const id of ["hygrophoropsis-aurantiaca", "cantharellus-cibarius", "omphalotus-olearius"]) {
      const species = (getSpecies(id) ?? getReferenceSpecies(id))!;
      expect(html).toContain(`href="${speciesPath(species)}"`);
      expect(html).toContain(species.identity.commonName);
      expect(html).toContain(species.identity.scientificName);
      expect(html).toContain(species.media.find(asset => asset.identificationReference)!.alt);
    }
    expect(html).toContain('aria-label="Advertiment de consum: Tòxic"');
    expect(html).not.toContain("El fals rossinyol encara no té fitxa pròpia al catàleg");
    expect(html).toContain('aria-label="Advertiment de consum: No recomanat"');
    expect(html).toContain('href="/compare/rossinyol-vs-bolet-olivera"');
  });

  it("publishes the official-source permissions checklist with truthful dates", () => {
    const html = renderToStaticMarkup(createElement(CollectingPage));
    expect(collectingMetadata.alternates?.canonical).toBe("/normativa-bolets");
    expect(collectingMetadata.robots).toBeUndefined();
    expect(collectingMetadata.description?.length).toBeLessThanOrEqual(155);
    expect(html).toContain('"@type":"Article"');
    expect(html).toContain('"datePublished":"2026-08-27"');
    expect(html).not.toContain('"reviewedBy"');
    for (const source of ["https://interior.gencat.cat/", "https://parcs.diba.cat/", "https://parcsnaturals.gencat.cat/", "https://acsa.gencat.cat/"]) expect(html).toContain(source);
    expect(publicEditorialItems).toContain("normativa-bolets");
    expect(sitemap().find(entry => entry.url.endsWith("/normativa-bolets"))?.lastModified).toEqual(new Date("2026-08-27T00:00:00+02:00"));
  });

  it("provides local rules and keeps dated fees and unresolved permissions explicit", () => {
    const html = renderToStaticMarkup(createElement(CollectingPage));
    for (const place of ["Aigüestortes", "Bosc de Virós", "Esterri de Cardós", "Poblet", "Cadí-Moixeró", "Els Ports"]) expect(html).toContain(place);
    for (const key of ["aiguestortes", "altPirineu", "poblet", "cadi", "ports", "authorisation"] as const) expect(html).toContain(collectingSources[key].url.replaceAll("&", "&amp;"));
    expect(html).toContain('dateTime="2023-07-13"');
    expect(html.match(/vigència per al 2026 no confirmada/g)).toHaveLength(2);
    expect(html).toContain("Carnet actual no confirmat");
    expect(html).not.toContain("collecting-fees");
    expect(html).not.toContain("Quant costa i quants quilos es poden collir?");
    expect(html).toContain("Cal pagar per collir bolets?");
    expect(html).toContain("En general, la recol·lecció particular és gratuïta, però hi ha espais amb tiquet de pagament");
    expect(html).toContain(collectingSources.altPirineuLeisure.url);
    expect(html).toContain("no són tarifes ni quotes aplicables a tot Catalunya");
    expect(html).toContain("El nom de la vall o de l’itinerari no és suficient");
    expect(html).not.toContain("no basta");
    expect(html).toContain("més de 40 persones, més de 4 vehicles o més de 7");
    expect(html).toContain("almenys un mes abans");
  });
});

describe("supplementary gallery descriptions", () => {
  it("describes each photo rather than using numbered generic views", () => {
    for (const [species, media] of Object.entries(speciesGalleryMedia)) {
      expect(new Set(media.map(asset => asset.alt)).size, species).toBe(media.length);
      for (const asset of media) {
        expect(asset.alt, asset.id).not.toMatch(/^(Vista addicional|Segona vista)/);
        expect(asset.alt.trim().length, asset.id).toBeGreaterThan(20);
        expect(asset.identificationReference, asset.id).toBe(false);
        expect(asset.attribution, asset.id).toBeTruthy();
        expect(asset.license, asset.id).toBeTruthy();
        expect(asset.sourceUrl, asset.id).toMatch(/^https:\/\//);
      }
    }
  });
});
