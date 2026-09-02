import { describe, expect, it, vi } from "vitest";

import {
  instagramSpeciesQueueCaption,
  instagramSpeciesQueueMarker,
  queueInstagramSpeciesPost,
} from "@/src/lib/buffer-instagram-species-queue";
import type { BufferInstagramPublisherConfig } from "@/src/lib/buffer-client";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const card: DailyShareCard = {
  slug: "catalunya",
  title: "Catalunya",
  eyebrow: "Dades del dia",
  observedAt: "2026-09-02T06:00:00.000Z",
  available: true,
  readings: [],
  mapPath: "/bolets-avui",
  shareText: "Lectura actual",
  scope: "overview",
  scopeLabel: "Visió general",
};

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

describe("Buffer Instagram species queue", () => {
  it("adds the selected five-image carousel to Buffer's next queue slot", async () => {
    const fetchImpl = connectedBufferResponses(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(response({ posts: { edges: [] } }))
      .mockResolvedValueOnce(response({
        createPost: { __typename: "PostActionSuccess", post: { id: "species-queue-1" } },
      }));
    const images = Array.from(
      { length: 5 },
      (_, index) => `https://bolets.app/species-${index + 1}.png`,
    );

    await expect(queueInstagramSpeciesPost({
      card,
      config,
      fetchImpl,
      imageUrls: images,
      now: new Date("2026-09-02T17:00:00.000Z"),
      speciesId: "boletus-edulis",
    })).resolves.toEqual({
      status: "queued",
      postId: "species-queue-1",
      speciesId: "boletus-edulis",
    });

    const createBody = JSON.parse(String(fetchImpl.mock.calls[3]?.[1]?.body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(createBody.variables.input).toMatchObject({
      assets: images.map((url) => ({ image: { url } })),
      metadata: { instagram: { shouldShareToFeed: true, type: "post" } },
      mode: "addToQueue",
      schedulingType: "automatic",
    });
    expect(createBody.variables.input.text).toContain("Cep");
    expect(createBody.variables.input.text).toContain(instagramSpeciesQueueMarker("boletus-edulis"));
  });

  it("preserves a custom caption and appends the duplicate-protection marker", () => {
    expect(instagramSpeciesQueueCaption("boletus-edulis", "Text revisat.")).toBe(
      `Text revisat.\n\n${instagramSpeciesQueueMarker("boletus-edulis")}`,
    );
  });

  it("does not create a second post for a species already in Buffer", async () => {
    const marker = instagramSpeciesQueueMarker("boletus-edulis");
    const fetchImpl = connectedBufferResponses(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(response({
        posts: { edges: [{ node: { id: "existing-1", text: `Text\n${marker}`, status: "scheduled" } }] },
      }));

    await expect(queueInstagramSpeciesPost({
      card,
      config,
      fetchImpl,
      imageUrls: Array.from({ length: 5 }, (_, index) => `https://bolets.app/${index}.png`),
      now: new Date("2026-09-02T17:00:00.000Z"),
      speciesId: "boletus-edulis",
    })).resolves.toMatchObject({ status: "already_queued", postId: "existing-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("fails before contacting Buffer for stale cards or an incomplete carousel", async () => {
    const staleFetch = vi.fn<typeof fetch>();
    await expect(queueInstagramSpeciesPost({
      card,
      config,
      fetchImpl: staleFetch,
      imageUrls: Array.from({ length: 5 }, (_, index) => `https://bolets.app/${index}.png`),
      now: new Date("2026-09-03T17:00:00.000Z"),
      speciesId: "boletus-edulis",
    })).rejects.toMatchObject({ code: "prediction_stale" });
    expect(staleFetch).not.toHaveBeenCalled();

    const assetFetch = vi.fn<typeof fetch>();
    await expect(queueInstagramSpeciesPost({
      card,
      config,
      fetchImpl: assetFetch,
      imageUrls: ["https://bolets.app/one.png"],
      now: new Date("2026-09-02T17:00:00.000Z"),
      speciesId: "boletus-edulis",
    })).rejects.toMatchObject({ code: "instagram_growth_assets_invalid" });
    expect(assetFetch).not.toHaveBeenCalled();
  });
});
