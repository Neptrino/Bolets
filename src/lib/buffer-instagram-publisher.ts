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

export async function publishDailyInstagramPrediction({
  card,
  config,
  fetchImpl = fetch,
  storyImageUrl,
  now = new Date(),
}: {
  card: DailyShareCard;
  config: BufferInstagramPublisherConfig;
  fetchImpl?: typeof fetch;
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

  const { channelId, organizationId } = await findInstagramChannel(config, fetchImpl);
  const posts = await readRecentInstagramPosts({
    channelId,
    config,
    fetchImpl,
    organizationId,
  });
  const existingStory = posts.find((post) => {
    const publishedAt = post.sentAt ?? post.createdAt;
    return post.metadata?.type === "story"
      && post.assets?.some((asset) => sameDailyStoryAsset(asset.source, storyImageUrl)) === true
      && typeof publishedAt === "string"
      && dateInCatalonia(new Date(publishedAt)) === publicationDate;
  });
  const storyPostId = typeof existingStory?.id === "string" ? existingStory.id : null;

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
    status: story.status,
    publicationDate,
    story,
  };
}
