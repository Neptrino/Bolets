import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { InstagramDailyCard } from "@/components/instagram-daily-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { instagramFormats, type InstagramFormat } from "@/src/lib/instagram-design";

export async function renderInstagramDailyCard({ card, format }: { card: DailyShareCard; format: InstagramFormat }) {
  const { width, height } = instagramFormats[format];
  const photo = await readFile(join(process.cwd(), "public/media/generated/home-hero-boletus-v2-share.jpg"));
  const homeHeroUrl = `data:image/jpeg;base64,${photo.toString("base64")}`;
  // Preserve the earlier daily card's bundled regular face as well as its layout.
  return new ImageResponse(<InstagramDailyCard card={card} format={format} homeHeroUrl={homeHeroUrl} />, { width, height });
}
