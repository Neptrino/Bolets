import { describe, expect, it } from "vitest";
import {
  territorialBoundsFromQuery,
  territorialMapPath,
} from "@/src/lib/territorial-map";

describe("territorial map links", () => {
  const ripolles = { west: 1.95, south: 42.05, east: 2.5, north: 42.45 };

  it("keeps the selected species, region and exact scoring window together", () => {
    const path = territorialMapPath("boletus-edulis", "pirineus", ripolles);
    const url = new URL(path, "https://bolets.app");

    expect(url.pathname).toBe("/map/cep");
    expect(url.searchParams.get("region")).toBe("pirineus");
    expect(territorialBoundsFromQuery(Object.fromEntries(url.searchParams))).toEqual(ripolles);
  });

  it("rejects incomplete, inverted and out-of-Catalonia windows", () => {
    expect(territorialBoundsFromQuery({ west: "1", south: "41" })).toBeNull();
    expect(territorialBoundsFromQuery({ west: "2", south: "42", east: "1", north: "42.5" })).toBeNull();
    expect(territorialBoundsFromQuery({ west: "-2", south: "41", east: "1", north: "42" })).toBeNull();
  });
});
