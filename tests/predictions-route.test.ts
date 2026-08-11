import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/predictions/route";

describe("prediction API bounds", () => {
  it("rejects requests with a missing coordinate", async () => {
    const response = await GET(new Request("http://localhost/api/predictions?species=boletus-edulis&south=40.48&east=3.32&north=42.92"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid or excessive bounding box" });
  });

  it("rejects excessive map extents", async () => {
    const response = await GET(new Request("http://localhost/api/predictions?species=boletus-edulis&west=-1&south=39&east=5&north=44"));

    expect(response.status).toBe(400);
  });

  it("rejects unsupported map resolutions", async () => {
    const response = await GET(new Request("http://localhost/api/predictions?species=boletus-edulis&west=1&south=41&east=2&north=42&resolution=750"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid map resolution" });
  });
});
