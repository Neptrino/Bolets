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
    const now = Date.now();
    for (const id of ids) {
      const metadata = getEditorialMetadata(id);
      expect(Object.keys(editorialAuthors), id).toContain(metadata.authorId);
      expect(metadata.reviewStatus, id).toBe("editorial-only");
      expect(new Date(metadata.publishedAt).getTime(), id).toBeLessThanOrEqual(now);
      expect(new Date(metadata.updatedAt).getTime(), id).toBeLessThanOrEqual(now);
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
