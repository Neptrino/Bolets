import { describe, expect, it } from "vitest";
import { instagramCoverBriefSchema } from "@/src/lib/instagram-cover-brief";
import { instagramPublicImage, instagramReferencePhoto } from "@/src/lib/instagram-image-assets";

const copy = { eyebrow: "El bosc", title: "Ha plogut. I ara?", subtitle: "La pluja és una part de la història." };

describe("local Instagram template boundaries", () => {
  it("accepts editorial questions but rejects invented map data and injected image paths", () => {
    expect(instagramCoverBriefSchema.safeParse({ ...copy, layout: "question", tone: "orange", motif: "water" }).success).toBe(true);
    expect(instagramCoverBriefSchema.safeParse({ ...copy, layout: "map", score: 90 }).success).toBe(false);
    expect(instagramCoverBriefSchema.safeParse({ ...copy, layout: "photo", speciesId: "boletus-edulis", imagePath: "/private/photo.jpg" }).success).toBe(false);
  });

  it("refuses assets outside public and unknown catalogue identities", async () => {
    await expect(instagramPublicImage("../package.json")).rejects.toThrow("local public assets");
    await expect(instagramReferencePhoto("invented-species")).rejects.toThrow("Unknown catalogue species");
  });
});
