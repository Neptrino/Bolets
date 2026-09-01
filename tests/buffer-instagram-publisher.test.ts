import { describe, expect, it, vi } from "vitest";
import {
  bufferInstagramPublisherConfig,
  dailyInstagramMarker,
  dateInCatalonia,
  isInstagramPublishRequestAuthorized,
  publishDailyInstagramPrediction,
  type BufferInstagramPublisherConfig,
} from "@/src/lib/buffer-instagram-publisher";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const card: DailyShareCard = {
  slug: "catalunya",
  title: "Catalunya",
  eyebrow: "Dades del dia",
  observedAt: "2026-08-31T06:00:00.000Z",
  available: true,
  readings: [{
    speciesId: "boletus-edulis",
    regionName: "Pirineus",
    speciesName: "Cep",
    score: 72,
    label: "alta",
    positiveCellShare: 0.4,
    score20CellShare: 0.25,
  }],
  mapPath: "/bolets-avui",
  shareText: "Condicions de bolets avui a Catalunya\n\nPirineus: Cep · 72/100\n\nhttps://bolets.app/bolets-avui",
  scope: "overview",
  scopeLabel: "Visió general",
};

const config: BufferInstagramPublisherConfig = {
  apiKey: "secret-buffer-key",
  apiUrl: "https://api.buffer.com",
  channelName: "bolets.app",
};

function bufferResponse(data: unknown) {
  return Response.json({ data });
}

function organizationResponse() {
  return bufferResponse({
    account: { organizations: [{ id: "organization-1", name: "Bolets" }] },
  });
}

function channelResponse() {
  return bufferResponse({
    channels: [{
      id: "channel-1",
      name: "bolets.app",
      service: "instagram",
      externalLink: "https://www.instagram.com/bolets.app/",
      isDisconnected: false,
      isLocked: false,
      organizationId: "organization-1",
    }],
  });
}

describe("Buffer Instagram daily publisher", () => {
  it("publishes today's verified feed and Story cards through Buffer", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(organizationResponse())
      .mockResolvedValueOnce(channelResponse())
      .mockResolvedValueOnce(bufferResponse({ posts: { edges: [] } }))
      .mockResolvedValueOnce(bufferResponse({
        createPost: { __typename: "PostActionSuccess", post: { id: "post-1" } },
      }))
      .mockResolvedValueOnce(bufferResponse({
        createPost: { __typename: "PostActionSuccess", post: { id: "story-1" } },
      }));

    await expect(publishDailyInstagramPrediction({
      card,
      config,
      fetchImpl,
      imageUrl: "https://bolets.app/compartir/catalunya/imatge?format=feed&signed=yes",
      storyImageUrl: "https://bolets.app/compartir/catalunya/imatge?format=story&signed=yes",
      now: new Date("2026-08-31T12:00:00.000Z"),
    })).resolves.toEqual({
      status: "published",
      publicationDate: "2026-08-31",
      feed: { status: "published", postId: "post-1" },
      story: { status: "published", postId: "story-1" },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(fetchImpl.mock.calls.every(([url]) => url === "https://api.buffer.com")).toBe(true);
    const recentPostsOptions = fetchImpl.mock.calls[2]?.[1] as RequestInit;
    const recentPostsBody = JSON.parse(String(recentPostsOptions.body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(recentPostsBody.variables.input).toMatchObject({
      filter: {
        channelIds: ["channel-1"],
        status: ["scheduled", "sending", "sent"],
      },
      organizationId: "organization-1",
      sort: [{ direction: "desc", field: "createdAt" }],
    });
    const feedOptions = fetchImpl.mock.calls[3]?.[1] as RequestInit;
    const feedBody = JSON.parse(String(feedOptions.body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(feedOptions.headers).toMatchObject({ Authorization: "Bearer secret-buffer-key" });
    expect(feedBody.variables.input).toMatchObject({
      channelId: "channel-1",
      metadata: {
        instagram: {
          shouldShareToFeed: true,
          type: "post",
        },
      },
      mode: "shareNow",
      schedulingType: "automatic",
    });
    expect(feedBody.variables.input.text).toContain(dailyInstagramMarker("2026-08-31"));
    expect(feedBody.variables.input.assets).toEqual([{
      image: { url: "https://bolets.app/compartir/catalunya/imatge?format=feed&signed=yes" },
    }]);

    const storyOptions = fetchImpl.mock.calls[4]?.[1] as RequestInit;
    const storyBody = JSON.parse(String(storyOptions.body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(storyBody.variables.input).toMatchObject({
      channelId: "channel-1",
      metadata: {
        instagram: {
          shouldShareToFeed: false,
          type: "story",
        },
      },
      mode: "shareNow",
      schedulingType: "automatic",
      text: "",
    });
    expect(storyBody.variables.input.assets).toEqual([{
      image: { url: "https://bolets.app/compartir/catalunya/imatge?format=story&signed=yes" },
    }]);
  });

  it("does not duplicate today's Story when its signed prediction payload has refreshed", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(organizationResponse())
      .mockResolvedValueOnce(channelResponse())
      .mockResolvedValueOnce(bufferResponse({
        posts: {
          edges: [{
            node: {
              id: "existing-post",
              text: `Avui\n${dailyInstagramMarker("2026-08-31")}`,
              metadata: { type: "post" },
              assets: [],
            },
          }, {
            node: {
              id: "existing-story",
              text: "",
              sentAt: "2026-08-31T06:30:00.000Z",
              metadata: { type: "story" },
              assets: [{
                source: "https://bolets.app/compartir/catalunya/imatge?format=story&card=first&signature=first",
              }],
            },
          }],
        },
      }));

    await expect(publishDailyInstagramPrediction({
      card,
      config,
      fetchImpl,
      imageUrl: "https://bolets.app/card.jpg",
      storyImageUrl: "https://bolets.app/compartir/catalunya/imatge?format=story&card=refreshed&signature=refreshed",
      now: new Date("2026-08-31T12:00:00.000Z"),
    })).resolves.toEqual({
      status: "already_published",
      publicationDate: "2026-08-31",
      feed: { status: "already_published", postId: "existing-post" },
      story: { status: "already_published", postId: "existing-story" },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("publishes the Story when today's feed already exists", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(organizationResponse())
      .mockResolvedValueOnce(channelResponse())
      .mockResolvedValueOnce(bufferResponse({
        posts: {
          edges: [{
            node: {
              id: "existing-post",
              text: `Avui\n${dailyInstagramMarker("2026-08-31")}`,
              metadata: { type: "post" },
              assets: [],
            },
          }, {
            node: {
              id: "yesterday-story",
              text: "",
              sentAt: "2026-08-30T12:00:00.000Z",
              metadata: { type: "story" },
              assets: [{
                source: "https://bolets.app/compartir/catalunya/imatge?format=story&card=yesterday&signature=yesterday",
              }],
            },
          }],
        },
      }))
      .mockResolvedValueOnce(bufferResponse({
        createPost: { __typename: "PostActionSuccess", post: { id: "story-1" } },
      }));

    await expect(publishDailyInstagramPrediction({
      card,
      config,
      fetchImpl,
      imageUrl: "https://bolets.app/card.jpg",
      storyImageUrl: "https://bolets.app/compartir/catalunya/imatge?format=story&card=today&signature=today",
      now: new Date("2026-08-31T12:00:00.000Z"),
    })).resolves.toEqual({
      status: "published",
      publicationDate: "2026-08-31",
      feed: { status: "already_published", postId: "existing-post" },
      story: { status: "published", postId: "story-1" },
    });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("fails closed before contacting Buffer when the reading is stale", async () => {
    const fetchImpl = vi.fn();
    await expect(publishDailyInstagramPrediction({
      card,
      config,
      fetchImpl,
      imageUrl: "https://bolets.app/card.jpg",
      storyImageUrl: "https://bolets.app/story.png",
      now: new Date("2026-09-01T12:00:00.000Z"),
    })).rejects.toMatchObject({
      code: "prediction_stale",
      status: 503,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("reports Buffer GraphQL errors without creating a post", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(Response.json({
      errors: [{ message: "Invalid access token" }],
    }));
    await expect(publishDailyInstagramPrediction({
      card,
      config,
      fetchImpl,
      imageUrl: "https://bolets.app/card.jpg",
      storyImageUrl: "https://bolets.app/story.png",
      now: new Date("2026-08-31T12:00:00.000Z"),
    })).rejects.toMatchObject({
      code: "buffer_api_error",
      status: 502,
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("uses Catalonia's civil day across the UTC boundary", () => {
    expect(dateInCatalonia(new Date("2026-08-30T22:30:00.000Z"))).toBe("2026-08-31");
    expect(dateInCatalonia(new Date("2026-12-31T23:30:00.000Z"))).toBe("2027-01-01");
  });

  it("requires a Buffer key and uses constant-time trigger authentication", () => {
    expect(bufferInstagramPublisherConfig({
      BUFFER_API_KEY: "token",
      BUFFER_INSTAGRAM_CHANNEL: "@bolets.app",
    })).toEqual({
      apiKey: "token",
      apiUrl: "https://api.buffer.com",
      channelName: "@bolets.app",
    });
    expect(() => bufferInstagramPublisherConfig({})).toThrow("BUFFER_API_KEY is required");

    expect(isInstagramPublishRequestAuthorized(new Headers({
      authorization: "Bearer publish-secret",
    }), "publish-secret")).toBe(true);
    expect(isInstagramPublishRequestAuthorized(new Headers({
      authorization: "Bearer wrong-secret",
    }), "publish-secret")).toBe(false);
  });
});
