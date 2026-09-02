import { afterEach, describe, expect, it, vi } from "vitest";

import { readInstagramPerformanceReport } from "@/src/lib/instagram-performance-server";
import { pinnedInstagramMarker } from "@/src/lib/instagram-pinned-posts";

function response(data: unknown) {
  return Response.json({ data });
}

afterEach(() => vi.unstubAllEnvs());

describe("Instagram performance report", () => {
  it("normalizes aggregate metrics and ranks recent sent posts", async () => {
    vi.stubEnv("BUFFER_API_KEY", "test-key");
    vi.stubEnv("BUFFER_INSTAGRAM_CHANNEL", "bolets.app");
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(response({ account: { organizations: [{ id: "org-1" }] } }))
      .mockResolvedValueOnce(response({
        channels: [{
          id: "channel-1",
          name: "bolets.app",
          service: "instagram",
          isDisconnected: false,
          isLocked: false,
          organizationId: "org-1",
        }],
      }))
      .mockResolvedValueOnce(response({
        aggregatedPostMetrics: {
          metrics: [
            { type: "postCount", name: "Posts", value: 5, unit: "count" },
            { type: "engagementRate", name: "Eng. Rate", value: 20.5, unit: "percentage" },
          ],
          metricsUpdatedAt: "2026-09-01T13:00:00.000Z",
        },
      }))
      .mockResolvedValueOnce(response({
        posts: {
          edges: [
            {
              node: {
                id: "post-1",
                text: "A top post",
                status: "sent",
                sentAt: "2026-08-31T10:00:00.000Z",
                metadata: { type: "post" },
                assets: [
                  { __typename: "ImageAsset", source: "https://example.com/untrusted.jpg" },
                  { __typename: "VideoAsset", source: "https://bolets.app/social/reel.mp4" },
                  {
                    __typename: "ImageAsset",
                    source: "https://bolets.app/compartir/catalunya/imatge?payload=signed",
                  },
                ],
                metrics: [
                  { type: "reach", name: "Reach", value: 104, unit: "count" },
                  { type: "shares", name: "Shares", value: 2, unit: "count" },
                ],
              },
            },
            {
              node: {
                id: "pinned-1",
                text: pinnedInstagramMarker("pinned-start"),
                status: "sending",
                metadata: { type: "post" },
              },
            },
          ],
        },
      }));

    const report = await readInstagramPerformanceReport({
      fetchImpl,
      now: new Date("2026-09-01T14:00:00.000Z"),
    });

    expect(report.metrics).toEqual([
      { key: "post_count", label: "Posts", value: 5, unit: "count" },
      { key: "engagement_rate", label: "Eng. Rate", value: 20.5, unit: "percentage" },
    ]);
    expect(report.topPosts).toEqual([{
      id: "post-1",
      caption: "A top post",
      format: "post",
      thumbnailPath: "/compartir/catalunya/imatge?payload=signed",
      publishedAt: "2026-08-31T10:00:00.000Z",
      reach: 104,
      shares: 2,
      saves: 0,
    }]);
    expect(report.pinnedPosts).toEqual([{
      series: "pinned-start",
      postId: "pinned-1",
    }]);
  });
});
