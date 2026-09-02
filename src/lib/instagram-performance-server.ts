import "server-only";

import {
  bufferGraphql,
  bufferInstagramPublisherConfig,
  findInstagramChannel,
  readRecentInstagramPosts,
} from "@/src/lib/buffer-client";
import {
  pinnedInstagramMarker,
  pinnedInstagramPosts,
  type PinnedInstagramSeries,
} from "@/src/lib/instagram-pinned-posts";

export interface InstagramMetric {
  key: string;
  label: string;
  value: number;
  unit: string | null;
}

export interface InstagramTopPost {
  id: string;
  caption: string;
  format: string;
  thumbnailPath: string | null;
  publishedAt: string | null;
  reach: number;
  shares: number;
  saves: number;
}

export interface InstagramPerformanceReport {
  channelName: string;
  startAt: string;
  endAt: string;
  metricsUpdatedAt: string | null;
  metrics: InstagramMetric[];
  pinnedPosts: Array<{ series: PinnedInstagramSeries; postId: string }>;
  topPosts: InstagramTopPost[];
}

function metricKey(type: unknown, name: unknown) {
  const value = typeof type === "string" && type.trim()
    ? type
    : typeof name === "string" ? name : "metric";
  return value.trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function metricLabel(type: unknown, name: unknown) {
  if (typeof name === "string" && name.trim()) return name.trim();
  if (typeof type === "string" && type.trim()) return type.trim();
  return "Mètrica";
}

function metricNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function metricValue(metrics: Array<{ type?: unknown; name?: unknown; value?: unknown }> | undefined, keys: string[]) {
  const normalizedKeys = keys.map((key) => key.toLocaleLowerCase("en"));
  const metric = metrics?.find((candidate) => {
    const key = metricKey(candidate.type, candidate.name);
    return normalizedKeys.some((expected) => key === expected || key.includes(expected));
  });
  return metricNumber(metric?.value);
}

function thumbnailPath(assets: Array<{ __typename?: unknown; source?: unknown }> | undefined) {
  for (const asset of assets ?? []) {
    if (asset.__typename !== "ImageAsset" || typeof asset.source !== "string") continue;
    try {
      const source = new URL(asset.source);
      if (source.protocol !== "https:" || source.hostname !== "bolets.app") continue;
      return `${source.pathname}${source.search}`;
    } catch {
      continue;
    }
  }
  return null;
}

export async function readInstagramPerformanceReport({
  fetchImpl = fetch,
  now = new Date(),
}: {
  fetchImpl?: typeof fetch;
  now?: Date;
} = {}): Promise<InstagramPerformanceReport> {
  const config = bufferInstagramPublisherConfig();
  const { channelId, organizationId } = await findInstagramChannel(config, fetchImpl);
  const endAt = now.toISOString();
  const startAt = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000).toISOString();
  const [aggregate, posts] = await Promise.all([
    bufferGraphql<{
      aggregatedPostMetrics?: {
        metrics?: Array<{ type?: unknown; name?: unknown; value?: unknown; unit?: unknown }>;
        metricsUpdatedAt?: unknown;
      };
    }>({
      config,
      fetchImpl,
      operation: "Reading aggregate Instagram metrics",
      query: `query InstagramPerformance($input: AggregatedPostMetricsInput!) {
        aggregatedPostMetrics(input: $input) {
          metrics { type name value unit }
          metricsUpdatedAt
        }
      }`,
      variables: {
        input: { channelIds: [channelId], endDateTime: endAt, organizationId, startDateTime: startAt },
      },
    }),
    readRecentInstagramPosts({
      channelId,
      config,
      fetchImpl,
      first: 100,
      organizationId,
    }),
  ]);

  const aggregated = aggregate.aggregatedPostMetrics;
  const metrics = (aggregated?.metrics ?? []).map((metric) => ({
    key: metricKey(metric.type, metric.name),
    label: metricLabel(metric.type, metric.name),
    value: metricNumber(metric.value),
    unit: typeof metric.unit === "string" ? metric.unit : null,
  }));
  const topPosts = posts
    .filter((post) => post.status === "sent" && typeof post.id === "string")
    .map((post): InstagramTopPost => ({
      id: post.id as string,
      caption: typeof post.text === "string"
        ? post.text.replace(/\s+/g, " ").trim().slice(0, 120)
        : "Text no disponible a Buffer",
      format: typeof post.metadata?.type === "string" ? post.metadata.type : "post",
      thumbnailPath: thumbnailPath(post.assets),
      publishedAt: typeof post.sentAt === "string" ? post.sentAt : null,
      reach: metricValue(post.metrics, ["reach", "impressions", "views"]),
      shares: metricValue(post.metrics, ["shares", "share"]),
      saves: metricValue(post.metrics, ["saves", "saved"]),
    }))
    .filter((post) => !post.publishedAt || new Date(post.publishedAt) >= new Date(startAt))
    .sort((left, right) => right.reach - left.reach || right.shares - left.shares)
    .slice(0, 5);
  const pinnedPosts = pinnedInstagramPosts.flatMap((pinnedPost) => {
    const matchingPost = posts.find(
      (post) => typeof post.text === "string"
        && post.text.includes(pinnedInstagramMarker(pinnedPost.series))
        && typeof post.id === "string",
    );
    return matchingPost && typeof matchingPost.id === "string"
      ? [{ series: pinnedPost.series, postId: matchingPost.id }]
      : [];
  });

  return {
    channelName: config.channelName,
    endAt,
    metrics,
    metricsUpdatedAt: typeof aggregated?.metricsUpdatedAt === "string"
      ? aggregated.metricsUpdatedAt
      : null,
    pinnedPosts,
    startAt,
    topPosts,
  };
}
