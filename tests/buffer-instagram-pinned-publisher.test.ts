import { describe, expect, it, vi } from "vitest";

import {
  publishPinnedInstagramPosts,
} from "@/src/lib/buffer-instagram-pinned-publisher";
import type { BufferInstagramPublisherConfig } from "@/src/lib/buffer-client";
import { pinnedInstagramMarker } from "@/src/lib/instagram-pinned-posts";

const config: BufferInstagramPublisherConfig = {
  apiKey: "buffer-key",
  apiUrl: "https://api.buffer.com",
  channelName: "bolets.app",
};

function response(data: unknown) {
  return Response.json({ data });
}

function connectedBufferResponses(fetchImpl: ReturnType<typeof vi.fn<typeof fetch>>) {
  return fetchImpl
    .mockResolvedValueOnce(response({ account: { organizations: [{ id: "org-1" }] } }))
    .mockResolvedValueOnce(response({
      channels: [{
        id: "channel-1",
        name: "bolets.app",
        service: "instagram",
        externalLink: "https://instagram.com/bolets.app/",
        isDisconnected: false,
        isLocked: false,
        organizationId: "org-1",
      }],
    }));
}

describe("Buffer Instagram pinned-post publisher", () => {
  it("publishes the profile sequence in reverse submission order", async () => {
    const fetchImpl = connectedBufferResponses(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(response({ posts: { edges: [] } }))
      .mockResolvedValueOnce(response({ createPost: { post: { id: "post-3" } } }))
      .mockResolvedValueOnce(response({ createPost: { post: { id: "post-2" } } }))
      .mockResolvedValueOnce(response({ createPost: { post: { id: "post-1" } } }));

    await expect(publishPinnedInstagramPosts({
      config,
      fetchImpl,
      imageUrlForSeries: (series) => `https://bolets.app/${series}.png`,
    })).resolves.toEqual({
      status: "published",
      posts: [
        { series: "pinned-start", status: "published", postId: "post-1" },
        { series: "pinned-method", status: "published", postId: "post-2" },
        { series: "pinned-safety", status: "published", postId: "post-3" },
      ],
    });

    const createdAssets = fetchImpl.mock.calls.slice(3).map((call) => {
      const body = JSON.parse(String(call[1]?.body)) as {
        variables: { input: { assets: unknown } };
      };
      return body.variables.input.assets;
    });
    expect(createdAssets).toEqual([
      [{ image: { url: "https://bolets.app/pinned-safety.png" } }],
      [{ image: { url: "https://bolets.app/pinned-method.png" } }],
      [{ image: { url: "https://bolets.app/pinned-start.png" } }],
    ]);
  });

  it("does not duplicate posts that already contain their stable markers", async () => {
    const fetchImpl = connectedBufferResponses(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(response({
        posts: {
          edges: ["pinned-start", "pinned-method", "pinned-safety"].map((series, index) => ({
            node: {
              id: `existing-${index + 1}`,
              text: pinnedInstagramMarker(series as "pinned-start" | "pinned-method" | "pinned-safety"),
              status: "sent",
            },
          })),
        },
      }));

    await expect(publishPinnedInstagramPosts({
      config,
      fetchImpl,
      imageUrlForSeries: (series) => `https://bolets.app/${series}.png`,
    })).resolves.toMatchObject({ status: "already_published" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
