import { INSTAGRAM_TEMPLATE_VERSION } from "@/src/lib/instagram-template-version";
import type { SocialGrowthSeries } from "@/components/social-growth-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { signedDailyShareImagePath } from "@/src/lib/daily-share-image-payload-server";
import type { InstagramEducationTopicId } from "@/src/lib/instagram-education";
import type { PinnedInstagramSeries } from "@/src/lib/instagram-pinned-posts";

export function pinnedInstagramImagePath(series: PinnedInstagramSeries) {
  return `/compartir/instagram/fixada/${series}?v=3&style=${INSTAGRAM_TEMPLATE_VERSION}`;
}

export function signedSocialGrowthImagePath(
  card: DailyShareCard,
  series: SocialGrowthSeries,
  slide: number,
  educationTopicId?: InstagramEducationTopicId,
) {
  const format = series === "weekend" ? "story" : "feed";
  const url = new URL(signedDailyShareImagePath(card, format), "https://bolets.app");
  url.searchParams.set("series", series);
  url.searchParams.set("slide", String(slide));
  if (series === "education" && educationTopicId) {
    url.searchParams.set("topic", educationTopicId);
  }
  url.searchParams.set("growthVersion", series === "weekend" ? "5" : "4");
  return `${url.pathname}${url.search}`;
}

export function signedWeekendReelPath(card: DailyShareCard) {
  const imagePath = signedSocialGrowthImagePath(card, "weekend", 1);
  const url = new URL(imagePath, "https://bolets.app");
  url.pathname = `/compartir/${card.slug}/reel`;
  url.searchParams.delete("format");
  url.searchParams.delete("series");
  url.searchParams.delete("slide");
  url.searchParams.set("reelVersion", "7");
  return `${url.pathname}${url.search}`;
}

export function signedSpeciesInstagramImagePath(
  card: DailyShareCard,
  publicationDate: string,
  slide: number,
  speciesId?: string | null,
) {
  const url = new URL(signedDailyShareImagePath(card, "feed"), "https://bolets.app");
  url.searchParams.set("series", "species");
  url.searchParams.set("date", publicationDate);
  url.searchParams.set("slide", String(slide));
  if (speciesId) url.searchParams.set("speciesId", speciesId);
  url.searchParams.set("speciesVersion", "4");
  return `${url.pathname}${url.search}`;
}
