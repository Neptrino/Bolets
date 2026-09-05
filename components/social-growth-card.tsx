import { InstagramWeekendCard, WEEKEND_SLIDE_COUNT } from "@/components/instagram-weekend-card";
import { InstagramEducationCard } from "@/components/instagram-education-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import type { InstagramEducationTopicId } from "@/src/lib/instagram-education";

export type SocialGrowthSeries = "education" | "weekend";

export function socialGrowthSlideCount(series: SocialGrowthSeries) {
  return series === "education" ? 5 : WEEKEND_SLIDE_COUNT;
}

export function isSocialGrowthSeries(value: string | null): value is SocialGrowthSeries {
  return value === "education" || value === "weekend";
}

export function SocialGrowthCard({ card, educationTopicId = "reading", mapImageUrl, series, slide }: {
  card: DailyShareCard;
  educationTopicId?: InstagramEducationTopicId;
  mapImageUrl?: string;
  series: SocialGrowthSeries;
  slide: number;
}) {
  return series === "weekend"
    ? <InstagramWeekendCard card={card} slide={slide} mapImageUrl={mapImageUrl} />
    : <InstagramEducationCard card={card} topicId={educationTopicId} slide={slide} />;
}
