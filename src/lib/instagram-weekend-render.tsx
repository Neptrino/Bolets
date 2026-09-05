import { ImageResponse } from "next/og";
import { InstagramWeekendCard, type WeekendPhoto } from "@/components/instagram-weekend-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { instagramReferencePhoto } from "@/src/lib/instagram-image-assets";

async function weekendPhoto(card: DailyShareCard): Promise<WeekendPhoto | undefined> {
  const leader = card.readings[0];
  return leader ? instagramReferencePhoto(leader.speciesId) : undefined;
}

export async function renderInstagramWeekendSlide({ card, slide, mapImageUrl }: { card: DailyShareCard; slide: number; mapImageUrl?: string }) {
  const [fonts, photo] = await Promise.all([
    instagramCardFonts(),
    slide === 3 ? weekendPhoto(card) : undefined,
  ]);
  return new ImageResponse(<InstagramWeekendCard card={card} slide={slide} photo={photo} mapImageUrl={mapImageUrl} />, {
    width: 1080, height: 1920, fonts,
  });
}
