import { describe, expect, it } from "vitest";
import { speciesProfiles } from "@/data/species";
import {
  absoluteUrl,
  jsonLd,
  metaDescription,
  pageTitle,
  speciesDescription,
  speciesImage,
  speciesPath,
} from "@/src/lib/seo";

describe("SEO helpers", () => {
  const species = speciesProfiles[0];

  it("builds canonical absolute URLs without duplicate slashes", () => {
    expect(absoluteUrl("/bolets")).toBe("https://bolets.app/bolets");
    expect(speciesPath(species)).toBe(`/bolets/${species.speciesId}`);
  });

  it("builds a descriptive species snippet", () => {
    const description = speciesDescription(species);
    expect(description).toContain(species.identity.commonName);
    expect(description).toContain(species.identity.scientificName);
    expect(description.length).toBeGreaterThan(80);
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it("keeps document titles and snippets within their rendered limits", () => {
    const title = pageTitle("Pinetells (rovellons) a Castellar de n’Hug: hàbitat i temporada");
    const description = metaDescription("paraula ".repeat(40));

    expect(title.length).toBeLessThanOrEqual(49);
    expect(title.endsWith("…")).toBe(true);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description.endsWith("…")).toBe(true);
  });

  it("uses a crawlable absolute image URL when media exists", () => {
    if (species.media.length > 0) {
      expect(speciesImage(species)).toMatch(/^https:\/\//);
    }
  });

  it("escapes markup-like content in JSON-LD", () => {
    expect(jsonLd({ value: "</script>" })).not.toContain("</script>");
    expect(jsonLd({ value: "</script>" })).toContain("\\u003c/script>");
  });
});
