import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { InstagramDailyCard, type DailyShareSpeciesIcons } from "@/components/instagram-daily-card";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import { instagramFormats, type InstagramFormat } from "@/src/lib/instagram-design";
import { speciesDrawing } from "@/src/lib/species-illustrations";

/** The drawn icons of the card's species. A drawing that is missing or fails to decode only drops its icon, never the card. */
async function dailySpeciesIcons(card: DailyShareCard): Promise<DailyShareSpeciesIcons> {
  const speciesIds = [...new Set(card.readings.map((reading) => reading.speciesId))];
  const icons = await Promise.all(speciesIds.map(async (speciesId) => {
    const src = speciesDrawing(speciesId)?.src;
    if (!src) return null;
    try {
      const png = await sharp(await readFile(join(process.cwd(), "public", src)))
        .resize(264, 264, { fit: "inside", withoutEnlargement: true })
        .png()
        .toBuffer();
      return [speciesId, `data:image/png;base64,${png.toString("base64")}`] as const;
    } catch {
      return null;
    }
  }));
  return Object.fromEntries(icons.filter((icon) => icon !== null));
}

export async function renderInstagramDailyCard({ card, format }: { card: DailyShareCard; format: InstagramFormat }) {
  const { width, height } = instagramFormats[format];
  const [photo, speciesIcons] = await Promise.all([
    readFile(join(process.cwd(), "public/media/generated/home-hero-boletus-v2-share.jpg")),
    dailySpeciesIcons(card),
  ]);
  const homeHeroUrl = `data:image/jpeg;base64,${photo.toString("base64")}`;
  // Preserve the earlier daily card's bundled regular face as well as its layout.
  return new ImageResponse(<InstagramDailyCard card={card} format={format} homeHeroUrl={homeHeroUrl} speciesIcons={speciesIcons} />, { width, height });
}
