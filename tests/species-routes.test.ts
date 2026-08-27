import { describe, expect, it } from "vitest";
import { generateStaticParams } from "@/app/bolets/[slug]/page";
import { GET as fieldCardImage } from "@/app/bolets/[slug]/targeta/route";
import { catalogueSpecies } from "@/data/catalogue";

describe("species routes", () => {
  it("generates one static route for every catalogue profile", () => {
    const params = generateStaticParams();

    expect(params).toHaveLength(catalogueSpecies.length);
    expect(new Set(params.map(({ slug }) => slug)).size).toBe(catalogueSpecies.length);
    expect(params.map(({ slug }) => slug)).toEqual(
      expect.arrayContaining(catalogueSpecies.map(({ speciesId }) => speciesId)),
    );
  });

  it("renders an Instagram-sized PNG field card and rejects unknown species", async () => {
    const response = await fieldCardImage(
      new Request("https://bolets.app/bolets/boletus-edulis/targeta"),
      { params: Promise.resolve({ slug: "boletus-edulis" }) },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(10_000);

    const missing = await fieldCardImage(
      new Request("https://bolets.app/bolets/no-existeix/targeta"),
      { params: Promise.resolve({ slug: "no-existeix" }) },
    );
    expect(missing.status).toBe(404);
  });
});
