import { describe, expect, it } from "vitest";
import { comparisonPages } from "@/data/comparison-pages";
import {
  editorialArticleFields,
  editorialAuthors,
  getEditorialMetadata,
  LOCAL_GUIDES_UPDATED_AT,
  publicEditorialItems,
} from "@/data/editorial";
import { speciesProfiles } from "@/data/species";

describe("editorial metadata", () => {
  const ids = [
    ...publicEditorialItems,
    ...speciesProfiles.map((species) => `species:${species.speciesId}`),
    ...comparisonPages.map((page) => `compare:${page.slug}`),
  ];

  it("gives every public editorial item valid revision metadata", () => {
    const todayInCatalonia = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    for (const id of ids) {
      const metadata = getEditorialMetadata(id);
      expect(Object.keys(editorialAuthors), id).toContain(metadata.authorId);
      expect(metadata.reviewStatus, id).toBe("editorial-only");
      expect(metadata.publishedAt.localeCompare(todayInCatalonia), id).toBeLessThanOrEqual(0);
      expect(metadata.updatedAt.localeCompare(todayInCatalonia), id).toBeLessThanOrEqual(0);
      expect(new Date(metadata.updatedAt).getTime(), id).toBeGreaterThanOrEqual(new Date(metadata.publishedAt).getTime());
    }
  });

  it("never implies a reviewer for editorial-only content", () => {
    for (const id of ids) {
      expect(editorialArticleFields(id)).not.toHaveProperty("reviewedBy");
      expect(JSON.stringify(editorialArticleFields(id))).not.toContain("reviewedBy");
    }
  });

  it("dates every local guide from the latest guide-wide editorial update", () => {
    const contentId = "guide:montseny:viladrau:boletus-edulis";
    expect(getEditorialMetadata(contentId).updatedAt).toBe(LOCAL_GUIDES_UPDATED_AT);
    expect(editorialArticleFields(contentId).dateModified).toBe(LOCAL_GUIDES_UPDATED_AT);
  });
});
