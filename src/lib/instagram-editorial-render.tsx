import { ImageResponse } from "next/og";
import { InstagramCover } from "@/components/instagram-cover";
import { InstagramEducationCard } from "@/components/instagram-education-card";
import { instagramCardFonts } from "@/src/lib/instagram-card-fonts";
import { instagramCoverBriefSchema, type InstagramCoverBrief } from "@/src/lib/instagram-cover-brief";
import { instagramFormats, type InstagramFormat } from "@/src/lib/instagram-design";
import { instagramReferencePhoto } from "@/src/lib/instagram-image-assets";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import type { InstagramEducationTopicId } from "@/src/lib/instagram-education";
import { pinnedCovers } from "@/src/lib/instagram-editorial-covers";
import type { PinnedInstagramSeries } from "@/src/lib/instagram-pinned-posts";

export async function renderInstagramCover({ brief: input, format = "feed", draft = true, footer }: { brief: InstagramCoverBrief; format?: InstagramFormat; draft?: boolean; footer?: string }) {
  const brief = instagramCoverBriefSchema.parse(input);
  const [fonts, photo] = await Promise.all([
    instagramCardFonts(),
    brief.layout === "photo" ? instagramReferencePhoto(brief.speciesId) : undefined,
  ]);
  const { width, height } = instagramFormats[format];
  return new ImageResponse(<InstagramCover brief={brief} photo={photo} format={format} draft={draft} footer={footer} />, { width, height, fonts });
}

export function renderInstagramPinnedCover(series: PinnedInstagramSeries) {
  return renderInstagramCover({ brief: pinnedCovers[series], draft: false, footer: "Guia · Coneix el bosc amb criteri" });
}

export async function renderInstagramEducationSlide({ card, topicId, slide }: { card: DailyShareCard; topicId: InstagramEducationTopicId; slide: number }) {
  return new ImageResponse(<InstagramEducationCard card={card} topicId={topicId} slide={slide} />, {
    width: instagramFormats.feed.width, height: instagramFormats.feed.height,
    fonts: await instagramCardFonts(),
  });
}
