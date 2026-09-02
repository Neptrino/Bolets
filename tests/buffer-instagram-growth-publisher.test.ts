import { describe, expect, it, vi } from "vitest";

import {
  instagramGrowthCaption,
  instagramGrowthMarker,
  publishInstagramGrowthPost,
} from "@/src/lib/buffer-instagram-growth-publisher";
import type { BufferInstagramPublisherConfig } from "@/src/lib/buffer-client";
import type { DailyShareCard } from "@/src/lib/daily-share-cards";

const card: DailyShareCard = {
  slug: "catalunya",
  title: "Catalunya",
  eyebrow: "Dades del dia",
  observedAt: "2026-09-02T06:00:00.000Z",
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

describe("Buffer Instagram growth publisher", () => {
  it("uses the profile link call to action in carousel and Reel captions", () => {
    for (const kind of ["education", "weekend"] as const) {
      const caption = instagramGrowthCaption(kind, card, "2026-09-02");
      expect(caption).toContain("l’enllaç del perfil → @bolets.app");
      expect(caption).not.toContain("https://bolets.app");
    }
  });

  it("changes the educational caption with the weekly curriculum", () => {
    const waterCaption = instagramGrowthCaption("education", card, "2026-09-02");
    const habitatCaption = instagramGrowthCaption("education", card, "2026-09-09");

    expect(waterCaption).toContain("Ha plogut. Vol dir que ja hi haurà bolets?");
    expect(habitatCaption).toContain("Bon temps per a bolets… però per a quina espècie?");
    expect(waterCaption).not.toBe(habitatCaption);
  });

  it("publishes the five-image educational carousel on Wednesday", async () => {
    const fetchImpl = connectedBufferResponses(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(response({ posts: { edges: [] } }))
      .mockResolvedValueOnce(response({
        createPost: { __typename: "PostActionSuccess", post: { id: "carousel-1" } },
      }));
    const images = Array.from({ length: 5 }, (_, index) => `https://bolets.app/slide-${index + 1}.png`);

    await expect(publishInstagramGrowthPost({
      card,
      config,
      educationImageUrls: images,
      fetchImpl,
      kind: "education",
      now: new Date("2026-09-02T17:00:00.000Z"),
    })).resolves.toEqual({
      status: "published",
      postId: "carousel-1",
      publicationDate: "2026-09-02",
      kind: "education",
    });

    const createBody = JSON.parse(String(fetchImpl.mock.calls[3]?.[1]?.body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(createBody.variables.input).toMatchObject({
      assets: images.map((url) => ({ image: { url } })),
      metadata: { instagram: { shouldShareToFeed: true, type: "post" } },
      mode: "shareNow",
    });
    expect(createBody.variables.input.text).toContain(instagramGrowthMarker("education", "2026-09-02"));
  });

  it("publishes the signed weekend video as a Reel on Friday", async () => {
    const fridayCard = { ...card, observedAt: "2026-09-04T06:00:00.000Z" };
    const fetchImpl = connectedBufferResponses(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(response({ posts: { edges: [] } }))
      .mockResolvedValueOnce(response({
        createPost: { __typename: "PostActionSuccess", post: { id: "reel-1" } },
      }));

    await publishInstagramGrowthPost({
      card: fridayCard,
      config,
      fetchImpl,
      kind: "weekend",
      now: new Date("2026-09-04T16:00:00.000Z"),
      reelUrl: "https://bolets.app/compartir/catalunya/reel?signed=yes",
    });

    const createBody = JSON.parse(String(fetchImpl.mock.calls[3]?.[1]?.body)) as {
      variables: { input: Record<string, unknown> };
    };
    expect(createBody.variables.input).toMatchObject({
      assets: [{ video: { url: "https://bolets.app/compartir/catalunya/reel?signed=yes" } }],
      metadata: { instagram: { shouldShareToFeed: true, type: "reel" } },
    });
  });

  it("does not duplicate a publication with the same channel date marker", async () => {
    const marker = instagramGrowthMarker("education", "2026-09-02");
    const fetchImpl = connectedBufferResponses(vi.fn<typeof fetch>())
      .mockResolvedValueOnce(response({
        posts: { edges: [{ node: { id: "existing-1", text: `Caption\n${marker}`, status: "sent" } }] },
      }));

    await expect(publishInstagramGrowthPost({
      card,
      config,
      educationImageUrls: Array.from({ length: 5 }, (_, index) => `https://bolets.app/${index}.png`),
      fetchImpl,
      kind: "education",
      now: new Date("2026-09-02T17:00:00.000Z"),
    })).resolves.toMatchObject({ status: "already_published", postId: "existing-1" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("fails before contacting Buffer when invoked on the wrong weekday", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    await expect(publishInstagramGrowthPost({
      card: { ...card, observedAt: "2026-09-01T06:00:00.000Z" },
      config,
      educationImageUrls: Array.from({ length: 5 }, (_, index) => `https://bolets.app/${index}.png`),
      fetchImpl,
      kind: "education",
      now: new Date("2026-09-01T17:00:00.000Z"),
    })).rejects.toMatchObject({ code: "instagram_growth_off_schedule", status: 409 });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
