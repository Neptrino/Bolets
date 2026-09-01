import {
  BufferPublicationError,
  createBufferInstagramPost,
  findInstagramChannel,
  readRecentInstagramPosts,
  type BufferInstagramPublisherConfig,
} from "@/src/lib/buffer-client";
import {
  pinnedInstagramCaption,
  pinnedInstagramMarker,
  pinnedInstagramPosts,
  type PinnedInstagramSeries,
} from "@/src/lib/instagram-pinned-posts";

export interface PinnedInstagramPublicationItem {
  series: PinnedInstagramSeries;
  status: "already_published" | "published";
  postId: string;
}

export interface PinnedInstagramPublicationResult {
  status: "already_published" | "published";
  posts: PinnedInstagramPublicationItem[];
}

export async function publishPinnedInstagramPosts({
  config,
  fetchImpl = fetch,
  imageUrlForSeries,
}: {
  config: BufferInstagramPublisherConfig;
  fetchImpl?: typeof fetch;
  imageUrlForSeries: (series: PinnedInstagramSeries) => string;
}): Promise<PinnedInstagramPublicationResult> {
  const captions = new Map(
    pinnedInstagramPosts.map((post) => [post.series, pinnedInstagramCaption(post.series)]),
  );
  if ([...captions.values()].some((caption) => caption.length > 2_200)) {
    throw new BufferPublicationError(
      "A pinned Instagram caption exceeds 2,200 characters",
      500,
      "instagram_caption_too_long",
    );
  }

  const { channelId, organizationId } = await findInstagramChannel(config, fetchImpl);
  const recentPosts = await readRecentInstagramPosts({
    channelId,
    config,
    fetchImpl,
    first: 100,
    organizationId,
  });
  const results: PinnedInstagramPublicationItem[] = [];

  // Submit 03 → 02 → 01 so the ordinary newest-first feed starts as 01 → 02 → 03.
  for (const post of [...pinnedInstagramPosts].reverse()) {
    const marker = pinnedInstagramMarker(post.series);
    const existing = recentPosts.find(
      (candidate) => typeof candidate.text === "string" && candidate.text.includes(marker),
    );
    if (typeof existing?.id === "string") {
      results.push({
        series: post.series,
        status: "already_published",
        postId: existing.id,
      });
      continue;
    }

    results.push({
      series: post.series,
      status: "published",
      postId: await createBufferInstagramPost({
        assets: [{ image: { url: imageUrlForSeries(post.series) } }],
        caption: captions.get(post.series)!,
        channelId,
        config,
        fetchImpl,
        type: "post",
      }),
    });
  }

  const orderedResults = pinnedInstagramPosts.map(
    (post) => results.find((result) => result.series === post.series)!,
  );
  return {
    status: orderedResults.every((post) => post.status === "already_published")
      ? "already_published"
      : "published",
    posts: orderedResults,
  };
}
