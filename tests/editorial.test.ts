import { describe, expect, it } from "vitest";
import { comparisonPages } from "@/data/comparison-pages";
import {
  editorialArticleFields,
  getEditorialMetadata,
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
      expect(metadata.authorId, id).toBe("editorial-team");
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
});
