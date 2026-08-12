import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/predictions/route";

describe("prediction availability", () => {
  it("rejects current-fruiting requests for habitat-only species", async () => {
    const response = await GET(new Request(
      "http://localhost/api/predictions?species=tuber-melanosporum",
    ));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Current fruiting predictions are not available for this species",
    });
  });
});
