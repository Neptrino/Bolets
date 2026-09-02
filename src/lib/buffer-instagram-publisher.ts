import type { DailyShareCard } from "@/src/lib/daily-share-cards";
import {
  BufferPublicationError,
  bufferInstagramPublisherConfig,
  createBufferInstagramPost,
  dateInCatalonia,
  findInstagramChannel,
  isInstagramPublishRequestAuthorized,
  readRecentInstagramPosts,
  type BufferInstagramPublisherConfig,
} from "@/src/lib/buffer-client";

export {
  BufferPublicationError,
  bufferInstagramPublisherConfig,
  dateInCatalonia,
  isInstagramPublishRequestAuthorized,
  type BufferInstagramPublisherConfig,
};

export interface InstagramPublicationResult {
  status: "already_published" | "published";
  publicationDate: string;
  feed: { status: "already_published" | "published"; postId: string };
  story: { status: "already_published" | "published"; postId: string };
}

function sameDailyStoryAsset(candidate: unknown, expected: string) {
  if (typeof candidate !== "string") return false;
  try {
    const candidateUrl = new URL(candidate);
    const expectedUrl = new URL(expected);
    return candidateUrl.origin === expectedUrl.origin
      && candidateUrl.pathname === expectedUrl.pathname
      && candidateUrl.searchParams.get("format") === "story"
      && expectedUrl.searchParams.get("format") === "story";
  } catch {
    return false;
  }
}

export function dailyInstagramMarker(publicationDate: string) {
  return `Publicació diària · ${publicationDate}`;
}

export function dailyInstagramCaption(card: DailyShareCard, publicationDate: string) {
  const captionBody = card.shareText
    .replace(/\nhttps:\/\/bolets\.app(?:\/\S*)?/gu, "")
    .trim();

  return `${captionBody}\n\nMapa complet a l’enllaç del perfil → @bolets.app\n\n${dailyInstagramMarker(publicationDate)}\n#BoletsAtles #BoletsCatalunya`;
}

export async function publishDailyInstagramPrediction({
  card,
  config,
  fetchImpl = fetch,
  imageUrl,
  storyImageUrl,
  now = new Date(),
}: {
  card: DailyShareCard;
  config: BufferInstagramPublisherConfig;
  fetchImpl?: typeof fetch;
  imageUrl: string;
  storyImageUrl: string;
  now?: Date;
}): Promise<InstagramPublicationResult> {
  if (!card.available || !card.observedAt || card.isPreview) {
    throw new BufferPublicationError(
      "There is no verified daily prediction to publish",
      503,
      "prediction_unavailable",
    );
  }

  const publicationDate = dateInCatalonia(new Date(card.observedAt));
  if (publicationDate !== dateInCatalonia(now)) {
    throw new BufferPublicationError(
      "The latest verified daily prediction is stale",
      503,
      "prediction_stale",
    );
  }

  const caption = dailyInstagramCaption(card, publicationDate);
  if (caption.length > 2_200) {
    throw new BufferPublicationError(
      "The daily Instagram caption exceeds 2,200 characters",
      500,
      "instagram_caption_too_long",
    );
  }

  const { channelId, organizationId } = await findInstagramChannel(config, fetchImpl);
  const marker = dailyInstagramMarker(publicationDate);
  const posts = await readRecentInstagramPosts({
    channelId,
    config,
    fetchImpl,
    organizationId,
  });
  const existingFeed = posts.find(
    (post) => typeof post.text === "string" && post.text.includes(marker),
  );
  const existingStory = posts.find((post) => {
    const publishedAt = post.sentAt ?? post.createdAt;
    return post.metadata?.type === "story"
      && post.assets?.some((asset) => sameDailyStoryAsset(asset.source, storyImageUrl)) === true
      && typeof publishedAt === "string"
      && dateInCatalonia(new Date(publishedAt)) === publicationDate;
  });
  const feedPostId = typeof existingFeed?.id === "string" ? existingFeed.id : null;
  const storyPostId = typeof existingStory?.id === "string" ? existingStory.id : null;

  const feed = feedPostId
    ? { status: "already_published" as const, postId: feedPostId }
    : {
        status: "published" as const,
        postId: await createBufferInstagramPost({
          assets: [{ image: { url: imageUrl } }],
          caption,
          channelId,
          config,
          fetchImpl,
          type: "post",
        }),
      };
  const story = storyPostId
    ? { status: "already_published" as const, postId: storyPostId }
    : {
        status: "published" as const,
        postId: await createBufferInstagramPost({
          assets: [{ image: { url: storyImageUrl } }],
          caption: "",
          channelId,
          config,
          fetchImpl,
          type: "story",
        }),
      };
  return {
    status: feed.status === "already_published" && story.status === "already_published"
      ? "already_published"
      : "published",
    publicationDate,
    feed,
    story,
  };
}
