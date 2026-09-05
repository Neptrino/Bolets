import { ImageResponse } from "next/og";
import { InstagramDailyCard } from "@/components/instagram-daily-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { instagramFormats, type InstagramFormat } from "@/src/lib/instagram-design";

export async function renderInstagramDailyCard({ card, format }: { card: DailyShareCard; format: InstagramFormat }) {
  const { width, height } = instagramFormats[format];
  return new ImageResponse(<InstagramDailyCard card={card} format={format} />, { width, height, fonts: await instagramCardFonts() });
}
