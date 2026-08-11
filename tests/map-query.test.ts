import { describe, expect, it } from "vitest";
import { formatMapCoordinate } from "@/src/lib/map-query";

describe("map request coordinates", () => {
  it("normalizes harmless viewport precision noise for stable cache keys", () => {
    expect(formatMapCoordinate(40.80875002816208)).toBe("40.8088");
    expect(formatMapCoordinate(40.80875002816251)).toBe("40.8088");
  });
});
