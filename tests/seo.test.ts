import { describe, expect, it } from "vitest";
import { speciesProfiles } from "@/data/species";
import {
  absoluteUrl,
  jsonLd,
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
