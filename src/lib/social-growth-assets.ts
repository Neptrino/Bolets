import type { SocialGrowthSeries } from "@/components/social-growth-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { signedDailyShareImagePath } from "@/src/lib/daily-share-image-payload-server";
import type { PinnedInstagramSeries } from "@/src/lib/instagram-pinned-posts";

export function pinnedInstagramImagePath(series: PinnedInstagramSeries) {
  return `/compartir/instagram/fixada/${series}?v=2`;
}

export function signedSocialGrowthImagePath(
  card: DailyShareCard,
  series: SocialGrowthSeries,
  slide: number,
) {
  const format = series === "weekend" ? "story" : "feed";
  const url = new URL(signedDailyShareImagePath(card, format), "https://bolets.app");
  url.searchParams.set("series", series);
  url.searchParams.set("slide", String(slide));
  url.searchParams.set("growthVersion", "2");
  return `${url.pathname}${url.search}`;
}

export function signedWeekendReelPath(card: DailyShareCard) {
  const imagePath = signedSocialGrowthImagePath(card, "weekend", 1);
  const url = new URL(imagePath, "https://bolets.app");
  url.pathname = `/compartir/${card.slug}/reel`;
  url.searchParams.delete("format");
  url.searchParams.delete("series");
  url.searchParams.delete("slide");
  url.searchParams.set("reelVersion", "4");
  return `${url.pathname}${url.search}`;
}
