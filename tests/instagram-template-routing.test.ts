import { describe, expect, it, vi } from "vitest";
import { createFavourableDailySharePreviewCards } from "@/src/lib/daily-share-cards";
import { parseSignedDailyShareCard } from "@/src/lib/daily-share-image-payload";
import { signedDailyShareImagePath } from "@/src/lib/daily-share-image-payload-server";
import { pinnedInstagramImagePath, signedSocialGrowthImagePath, signedSpeciesInstagramImagePath, signedWeekendReelPath } from "@/src/lib/social-growth-assets";
import { INSTAGRAM_TEMPLATE_VERSION } from "@/src/lib/instagram-template-version";

describe("Instagram template cache identity", () => {
  it("versions every scheduled format without losing the signed reading or selected topic", () => {
    vi.stubEnv("DAILY_SHARE_CARD_SIGNING_SECRET", "test-only-instagram-secret");
    try {
      const card = createFavourableDailySharePreviewCards()[0];
      const paths = [
        signedDailyShareImagePath(card, "story"),
        signedSocialGrowthImagePath(card, "education", 2, "habitat"),
        signedSocialGrowthImagePath(card, "weekend", 1),
        signedSpeciesInstagramImagePath(card, "2026-09-05", 4, "boletus-edulis"),
        signedWeekendReelPath(card),
      ];
      for (const path of paths) {
        const url = new URL(path, "https://bolets.app");
        expect(url.searchParams.get("style")).toBe(INSTAGRAM_TEMPLATE_VERSION);
        expect(parseSignedDailyShareCard(url.searchParams, card.slug, "test-only-instagram-secret")?.readings).toEqual(card.readings);
      }
      expect(new URL(paths[1], "https://bolets.app").searchParams.get("topic")).toBe("habitat");
      expect(new URL(paths[3], "https://bolets.app").searchParams.get("speciesId")).toBe("boletus-edulis");
      expect(new URL(pinnedInstagramImagePath("pinned-start"), "https://bolets.app").searchParams.get("style")).toBe(INSTAGRAM_TEMPLATE_VERSION);
    } finally { vi.unstubAllEnvs(); }
  });
});
